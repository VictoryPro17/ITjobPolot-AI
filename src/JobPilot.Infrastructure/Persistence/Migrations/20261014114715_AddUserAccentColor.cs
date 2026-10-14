using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAccentColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccentColor",
                table: "AspNetUsers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "blue");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccentColor",
                table: "AspNetUsers");
        }
    }
}
