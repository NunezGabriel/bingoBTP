/*
  Warnings:

  - Added the required column `rondaId` to the `Cartilla` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cartilla" ADD COLUMN     "rondaId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Ronda" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ronda_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Cartilla" ADD CONSTRAINT "Cartilla_rondaId_fkey" FOREIGN KEY ("rondaId") REFERENCES "Ronda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
