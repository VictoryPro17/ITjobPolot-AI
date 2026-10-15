using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserOnboarding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "OnboardingCompletedAt",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            // Bestehende Konten haben die Anwendung bereits genutzt und muessen den
            // Einstieg nicht nachholen; nur neue Registrierungen durchlaufen ihn.
            migrationBuilder.Sql("UPDATE \"AspNetUsers\" SET \"OnboardingCompletedAt\" = now() WHERE \"OnboardingCompletedAt\" IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingCompletedAt",
                table: "AspNetUsers");
        }
    }
}
