using JobPilot.Application.Abstractions;
using JobPilot.Application.Auth;
using JobPilot.Infrastructure.Email;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPilot.Tests.Infrastructure;

public class AccountEmailsTests
{
    [Theory]
    [InlineData("CfDJ8+abc/def==")]
    [InlineData("ä+/=?&#")]
    public void Token_RoundTripsThroughUrlSafeEncoding(string token)
    {
        var encoded = AccountEmails.EncodeToken(token);

        Assert.DoesNotContain('+', encoded);
        Assert.DoesNotContain('/', encoded);
        Assert.DoesNotContain('=', encoded);
        Assert.Equal(token, AccountEmails.DecodeToken(encoded));
    }

    [Fact]
    public void DecodeToken_ReturnsNullForGarbage()
    {
        Assert.Null(AccountEmails.DecodeToken("***"));
    }

    [Fact]
    public void BuildLink_EscapesQueryValues()
    {
        var link = AccountEmails.BuildLink("http://localhost:5173/", "/passwort-zuruecksetzen", new Dictionary<string, string>
        {
            ["email"] = "a+b@example.com",
            ["token"] = "x y&z"
        });

        Assert.Equal("http://localhost:5173/passwort-zuruecksetzen?email=a%2Bb%40example.com&token=x%20y%26z", link);
    }

    [Fact]
    public void PasswordReset_ContainsLinkAndEncodesUserInputInHtml()
    {
        var message = AccountEmails.PasswordReset("nora@example.com", "<script>alert(1)</script>", "http://localhost:5173/passwort-zuruecksetzen?token=abc");

        Assert.Equal("Passwort zurücksetzen", message.Subject);
        Assert.Contains("http://localhost:5173/passwort-zuruecksetzen?token=abc", message.TextBody);
        Assert.Contains("2 Stunden", message.TextBody);
        Assert.DoesNotContain("<script>", message.HtmlBody);
        Assert.Contains("&lt;script&gt;", message.HtmlBody);
    }

    [Fact]
    public void Confirmation_GreetsByFirstNameOrNeutrally()
    {
        Assert.StartsWith("Hallo Nora,", AccountEmails.Confirmation("nora@example.com", "Nora", "http://x").TextBody);
        Assert.StartsWith("Hallo,", AccountEmails.Confirmation("nora@example.com", null, "http://x").TextBody);
    }

    [Fact]
    public void Enqueue_NeverBlocksEvenWhenTheQueueIsFull()
    {
        // Ohne Dispatcher fuellt sich die Schlange; Einreihen muss trotzdem sofort zurueckkehren.
        var queue = new EmailQueue(NullLogger<EmailQueue>.Instance);
        var message = new EmailMessage("a@example.com", null, "Test", "<p>x</p>", "x");

        for (var i = 0; i < EmailQueue.Capacity + 10; i++)
        {
            Assert.True(queue.EnqueueAsync(message).IsCompletedSuccessfully);
        }
    }

    [Fact]
    public async Task Dispatcher_SendsQueuedMessagesAndSurvivesFailures()
    {
        var sender = new RecordingSender(failFirst: true);
        var services = new ServiceCollection().AddSingleton<IEmailSender>(sender).BuildServiceProvider();
        var queue = new EmailQueue(NullLogger<EmailQueue>.Instance);
        var dispatcher = new EmailDispatcher(queue, services.GetRequiredService<IServiceScopeFactory>(), NullLogger<EmailDispatcher>.Instance);

        await dispatcher.StartAsync(CancellationToken.None);
        await queue.EnqueueAsync(new EmailMessage("a@example.com", null, "Eins", "<p>1</p>", "1"));
        await queue.EnqueueAsync(new EmailMessage("b@example.com", null, "Zwei", "<p>2</p>", "2"));

        // Die erste Mail scheitert, die zweite muss trotzdem ankommen.
        for (var attempt = 0; attempt < 50 && sender.Sent.Count == 0; attempt++)
        {
            await Task.Delay(20);
        }
        await dispatcher.StopAsync(CancellationToken.None);

        Assert.Equal(["Zwei"], sender.Sent.Select(message => message.Subject));
    }

    [Theory]
    [InlineData("", "token", "Testpasswort123", false)]
    [InlineData("nora@example.com", "", "Testpasswort123", false)]
    [InlineData("nora@example.com", "token", "kurz", false)]
    [InlineData("nora@example.com", "token", "Testpasswort123", true)]
    public void ResetPasswordValidator_ChecksAllFields(string email, string token, string password, bool expectedValid)
    {
        var result = new ResetPasswordRequestValidator().Validate(new ResetPasswordRequest(email, token, password));
        Assert.Equal(expectedValid, result.IsValid);
    }

    [Fact]
    public void ForgotPasswordValidator_RequiresValidEmail()
    {
        Assert.False(new ForgotPasswordRequestValidator().Validate(new ForgotPasswordRequest("keine-mail")).IsValid);
        Assert.True(new ForgotPasswordRequestValidator().Validate(new ForgotPasswordRequest("nora@example.com")).IsValid);
    }

    private sealed class RecordingSender(bool failFirst) : IEmailSender
    {
        private bool _failNext = failFirst;
        public List<EmailMessage> Sent { get; } = [];

        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            if (_failNext)
            {
                _failNext = false;
                throw new InvalidOperationException("SMTP nicht erreichbar");
            }

            Sent.Add(message);
            return Task.CompletedTask;
        }
    }
}
