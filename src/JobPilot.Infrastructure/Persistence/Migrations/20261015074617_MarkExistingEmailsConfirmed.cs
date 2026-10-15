using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MarkExistingEmailsConfirmed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Konten von vor der E-Mail-Bestaetigung sollen keinen Hinweisbalken sehen.
            // Neue Konten bestaetigen ihre Adresse ueber den Link in der Bestaetigungsmail.
            migrationBuilder.Sql("UPDATE \"AspNetUsers\" SET \"EmailConfirmed\" = TRUE WHERE \"EmailConfirmed\" = FALSE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nicht umkehrbar: Welche Konten vorher unbestaetigt waren, ist nicht mehr bekannt.
        }
    }
}
