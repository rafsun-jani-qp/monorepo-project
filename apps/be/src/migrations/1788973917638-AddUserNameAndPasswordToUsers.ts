import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserNameAndPasswordToUsers1788973917638 implements MigrationInterface {
    name = 'AddUserNameAndPasswordToUsers1788973917638'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "userName" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password" character varying`);
        // Backfill existing rows with placeholder values so the NOT NULL/UNIQUE
        // constraints below can be applied. These accounts have no usable
        // password until it is reset via the app.
        await queryRunner.query(`UPDATE "users" SET "userName" = 'user_' || substr("id"::text, 1, 8), "password" = 'CHANGE_ME' WHERE "userName" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "userName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_userName" UNIQUE ("userName")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_userName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "userName"`);
    }

}
