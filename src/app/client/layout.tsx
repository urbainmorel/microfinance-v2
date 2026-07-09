export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] bg-radial-app px-5 pb-24 pt-6">
      {children}
    </div>
  );
}
