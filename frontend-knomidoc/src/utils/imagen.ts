/**
 * Reduce una imagen elegida por el usuario a un cuadrado (recorte central) y la
 * devuelve como data URL JPEG liviana, apta para guardarla como foto de perfil.
 */
export function reducirImagen(archivo: File, lado = 192, calidad = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(archivo.type)) {
      reject(new Error('Elija una imagen PNG, JPG o WEBP.'))
      return
    }
    if (archivo.size > 8 * 1024 * 1024) {
      reject(new Error('La imagen supera los 8 MB.'))
      return
    }
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      const lado0 = Math.min(img.width, img.height)
      const sx = (img.width - lado0) / 2
      const sy = (img.height - lado0) / 2
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = lado
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Su navegador no pudo procesar la imagen.'))
        return
      }
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, lado, lado)
      ctx.drawImage(img, sx, sy, lado0, lado0, 0, 0, lado, lado)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', calidad))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}
