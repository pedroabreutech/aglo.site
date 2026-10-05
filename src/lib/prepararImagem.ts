// O P2PNet do Aglo reduz a imagem para 2048 px no lado maior, então enviar
// mais que isso só gasta banda e espaço no Drive.
export const LADO_MAXIMO = 2048;
// Abaixo disso o serviço de inferência recusa a imagem.
export const LADO_MINIMO = 128;
export const TAMANHO_MAXIMO_ARQUIVO = 30 * 1024 * 1024;
const QUALIDADE_JPEG = 0.88;

export type ImagemPreparada = {
  base64: string;
  previewUrl: string;
  largura: number;
  altura: number;
};

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

// Recodificar em JPEG também descarta os metadados EXIF, incluindo a localização GPS.
export async function prepararImagem(arquivo: File): Promise<ImagemPreparada> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível abrir esta imagem. Envie uma foto em JPG, PNG ou WebP.");
  }

  const { width, height } = bitmap;
  if (Math.min(width, height) < LADO_MINIMO) {
    bitmap.close();
    throw new Error(`A foto é pequena demais. Envie uma imagem com pelo menos ${LADO_MINIMO} px de cada lado.`);
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(width, height));
  const largura = Math.round(width * escala);
  const altura = Math.round(height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");
  if (!contexto) {
    bitmap.close();
    throw new Error("Seu navegador não conseguiu processar a imagem.");
  }

  contexto.fillStyle = "#FFFFFF";
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG),
  );
  if (!blob) {
    throw new Error("Seu navegador não conseguiu processar a imagem.");
  }

  return {
    base64: await blobParaBase64(blob),
    previewUrl: URL.createObjectURL(blob),
    largura,
    altura,
  };
}
