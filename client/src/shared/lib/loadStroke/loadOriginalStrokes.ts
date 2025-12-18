// import fs from 'fs/promises';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// /**
//  * Quick Draw NDJSON에서 stroke 데이터 로드
//  * @param {string} imageName - 이미지 파일명 (예: 'star.png')
//  * @returns {Promise<Array>} - stroke 배열
//  */
// async function loadOriginalStrokes(imageName) {
//   // 파일명에서 확장자 제거
//   const category = imageName.replace('.png', '');
//   const ndjsonPath = path.join(
//     __dirname,
//     '../data/quickdraw',
//     `${category}.ndjson`,
//   );

//   try {
//     const data = await fs.readFile(ndjsonPath, 'utf-8');
//     const firstLine = data.split('\n')[0];
//     const json = JSON.parse(firstLine);
//     return json.drawing || [];
//   } catch (error) {
//     console.error(`원본 stroke 로드 실패 (${imageName}):`, error.message);
//     return [];
//   }
// }
