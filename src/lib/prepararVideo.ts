export type VideoPreparado = {
  arquivo: File;
  previewUrl: string;
  previewDisponivel: boolean;
  largura: number;
  altura: number;
  duracao: number;
};

export async function prepararVideo(arquivo: File): Promise<VideoPreparado> {
  const previewUrl = URL.createObjectURL(arquivo);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = previewUrl;

  const metadados = await new Promise<{ largura: number; altura: number; duracao: number } | null>(
    (resolve) => {
      const temporizador = window.setTimeout(() => resolve(null), 4000);
      video.onloadedmetadata = () => {
        window.clearTimeout(temporizador);
        resolve({
          largura: video.videoWidth,
          altura: video.videoHeight,
          duracao: Number.isFinite(video.duration) ? video.duration : 0,
        });
      };
      video.onerror = () => {
        window.clearTimeout(temporizador);
        resolve(null);
      };
    },
  );

  video.removeAttribute("src");
  video.load();

  return {
    arquivo,
    previewUrl,
    previewDisponivel: Boolean(metadados),
    largura: metadados?.largura ?? 0,
    altura: metadados?.altura ?? 0,
    duracao: metadados?.duracao ?? 0,
  };
}
