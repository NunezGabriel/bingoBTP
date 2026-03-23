-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cartilla" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "completo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Cartilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Casilla" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "pregunta" TEXT NOT NULL,

    CONSTRAINT "Casilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelacionCasilla" (
    "id" SERIAL NOT NULL,
    "cartillaId" INTEGER NOT NULL,
    "casillaId" INTEGER NOT NULL,

    CONSTRAINT "RelacionCasilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Firma" (
    "id" SERIAL NOT NULL,
    "cartillaId" INTEGER NOT NULL,
    "casillaId" INTEGER NOT NULL,
    "firmadoPorId" INTEGER NOT NULL,
    "firmadoAId" INTEGER NOT NULL,

    CONSTRAINT "Firma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigo_key" ON "Usuario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Casilla_numero_key" ON "Casilla"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "RelacionCasilla_cartillaId_casillaId_key" ON "RelacionCasilla"("cartillaId", "casillaId");

-- CreateIndex
CREATE UNIQUE INDEX "Firma_cartillaId_casillaId_key" ON "Firma"("cartillaId", "casillaId");

-- AddForeignKey
ALTER TABLE "Cartilla" ADD CONSTRAINT "Cartilla_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelacionCasilla" ADD CONSTRAINT "RelacionCasilla_cartillaId_fkey" FOREIGN KEY ("cartillaId") REFERENCES "Cartilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelacionCasilla" ADD CONSTRAINT "RelacionCasilla_casillaId_fkey" FOREIGN KEY ("casillaId") REFERENCES "Casilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firma" ADD CONSTRAINT "Firma_cartillaId_fkey" FOREIGN KEY ("cartillaId") REFERENCES "Cartilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firma" ADD CONSTRAINT "Firma_casillaId_fkey" FOREIGN KEY ("casillaId") REFERENCES "Casilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firma" ADD CONSTRAINT "Firma_firmadoPorId_fkey" FOREIGN KEY ("firmadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firma" ADD CONSTRAINT "Firma_firmadoAId_fkey" FOREIGN KEY ("firmadoAId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
