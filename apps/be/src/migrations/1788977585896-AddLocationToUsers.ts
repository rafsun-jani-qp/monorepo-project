import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationToUsers1788977585896 implements MigrationInterface {
    name = 'AddLocationToUsers1788977585896'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "location" character varying`);
        // Backfill existing rows with a placeholder so SET NOT NULL below can succeed.
        await queryRunner.query(`UPDATE "users" SET "location" = 'Unknown' WHERE "location" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "location" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "location"`);
    }

}
