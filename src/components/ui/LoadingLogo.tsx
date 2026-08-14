import { LogoMark } from '@/components/ui/LogoMark';

export function LoadingLogo({ fullHeight = false }: { fullHeight?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullHeight ? 'min-h-screen' : 'min-h-[60vh]'
      }`}
    >
      <LogoMark size={72} />
    </div>
  );
}