export const loadHeic2Any = () => {
  return new Promise((resolve, reject) => {
    if (window.heic2any) {
      resolve(window.heic2any)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'
    script.onload = () => {
      if (window.heic2any) {
        resolve(window.heic2any)
      } else {
        reject(new Error('heic2any 라이브러리를 로드하지 못했습니다.'))
      }
    }
    script.onerror = () => {
      reject(new Error('HEIC 변환 라이브러리(heic2any) 로드 중 오류가 발생했습니다.'))
    }
    document.head.appendChild(script)
  })
}

export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1280
        const MAX_HEIGHT = 1280
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(dataUrl)
      }
      img.onerror = () => {
        reject(new Error('이미지 로드에 실패했습니다.'))
      }
      img.src = event.target.result
    }
    reader.onerror = () => {
      reject(new Error('파일 읽기에 실패했습니다.'))
    }
    reader.readAsDataURL(file)
  })
}
