import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiKeyEntity1789110851951 implements MigrationInterface {
    name = 'AddApiKeyEntity1789110851951'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "prefix" character varying NOT NULL, "hashedKey" character varying NOT NULL, "label" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "lastUpdatedAt" TIMESTAMP, "revokedAt" TIMESTAMP, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "api_keys"`);
    }

}
