import { OrbitLoader } from '@/components/ui/OrbitLoader';

export default function GlobalLoading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8">
      <OrbitLoader
        size="lg"
        text="Loading Design Orbit..."
        subtitle="Synchronizing workspace & reports"
      />
    </div>
  );
}
