/*
  Warnings:

  - A unique constraint covering the columns `[cartillaId,firmadoPorId,firmadoAId]` on the table `Firma` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Firma_cartillaId_casillaId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Firma_cartillaId_firmadoPorId_firmadoAId_key" ON "Firma"("cartillaId", "firmadoPorId", "firmadoAId");
