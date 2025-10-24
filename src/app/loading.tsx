export default function Loading() {
  return (
    <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}
