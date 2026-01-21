import { Pool } from 'pg';

// 디버깅: 서버 시작 시 환경변수 로드 확인 (비밀번호는 노출 안되게 길이만 체크)
console.log('================ DB 접속 정보 확인 ================');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Password Loaded: ${process.env.DB_PASSWORD ? 'Yes' : 'No'}`);
console.log('==================================================');

const pool = new Pool({
  user: process.env.DB_USER,
  // ▼ 여기가 핵심: undefined일 경우 빈 문자열이라도 들어가게 처리
  password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function executeQuery(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } catch (err) {
    console.error('Database Error:', err);
    throw err;
  } finally {
    client.release();
  }
}
