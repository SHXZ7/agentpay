'use client';
import { useRouter } from 'next/navigation';
import AuthScreen from '@/components/AuthScreen';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (userProfile) => {
    router.push('/');
  };

  return (
    <AuthScreen onLoginSuccess={handleLoginSuccess} />
  );
}
