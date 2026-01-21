import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { executeQuery } from '@/lib/db';

// 1. 설정 옵션을 변수에 담고 export 합니다.
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async signIn({ user }: any) {
      if (!user.email) return false;
      try {
        const existingUser: any = await executeQuery(
          'SELECT * FROM est_users WHERE email = $1',
          [user.email],
        );

        if (existingUser.length === 0) {
          await executeQuery(
            "INSERT INTO est_users (email, name, role, is_approved) VALUES ($1, $2, 'USER', false)",
            [user.email, user.name || '이름없음'],
          );
          console.log(`[신규가입] DB 저장 완료: ${user.email}`);
          return false;
        }

        if (!existingUser[0].is_approved) {
          console.log(`[승인대기] 로그인 차단: ${user.email}`);
          return false;
        }

        return true;
      } catch (error) {
        console.error('============ 로그인/DB 에러 발생 ============');
        console.error(error);
        return false;
      }
    },
    async session({ session }: any) {
      try {
        const dbUser: any = await executeQuery(
          'SELECT id, role, is_approved FROM est_users WHERE email = $1',
          [session.user?.email],
        );
        if (dbUser.length > 0) {
          session.user = { ...session.user, ...dbUser[0] };
        }
      } catch (error) {
        console.error('세션 처리 에러:', error);
      }
      return session;
    },
  },
  debug: true,
};

// 2. NextAuth 함수에 위에서 만든 옵션을 넣어줍니다.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
