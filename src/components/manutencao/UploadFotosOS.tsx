"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, X, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface FotoTemp {
    file: File;
    preview: string;
    uploading: boolean;
}

interface UploadFotosOSProps {
    onFotosChange: (urls: string[]) => void;
    fotosIniciais?: string[];
}

export function UploadFotosOS({ onFotosChange, fotosIniciais = [] }: UploadFotosOSProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fotos, setFotos] = useState<string[]>(fotosIniciais);
    const [fotosTemp, setFotosTemp] = useState<FotoTemp[]>([]);
    const [uploadingGlobal, setUploadingGlobal] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const novasFotosTemp = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            uploading: true
        }));

        setFotosTemp(prev => [...prev, ...novasFotosTemp]);
        setUploadingGlobal(true);

        for (const foto of novasFotosTemp) {
            const formData = new FormData();
            formData.append("file", foto.file);
            formData.append("layoutId", "os-photos"); // Usando um ID genérico para o storage

            try {
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();

                if (data.url) {
                    setFotos(prev => {
                        const updated = [...prev, data.url];
                        onFotosChange(updated);
                        return updated;
                    });
                } else {
                    toast.error(`Erro ao subir ${foto.file.name}`);
                }
            } catch (error) {
                console.error("Erro upload:", error);
                toast.error(`Erro na conexão ao subir ${foto.file.name}`);
            } finally {
                setFotosTemp(prev => prev.filter(f => f.file !== foto.file));
            }
        }

        setUploadingGlobal(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removerFoto = (index: number) => {
        const updated = fotos.filter((_, i) => i !== index);
        setFotos(updated);
        onFotosChange(updated);
    };

    return (
        <div className="space-y-4 rounded-lg border border-[#1E1E1E] bg-[#111111] p-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-medium text-white">
                    <ImageIcon size={18} className="text-[#CC0000]" />
                    Fotos da OS
                </h3>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingGlobal}
                    className="flex items-center gap-2 rounded-md bg-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2A2A2A] disabled:opacity-50"
                >
                    {uploadingGlobal ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Adicionar Fotos
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {/* Fotos Já Salvas/Subidas */}
                {fotos.map((url, index) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-[#1E1E1E] bg-[#0A0A0A]">
                        <img src={url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removerFoto(index)}
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {/* Fotos em Upload */}
                {fotosTemp.map((foto, index) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-[#CC0000]/30 bg-[#0A0A0A] opacity-60">
                        <img src={foto.preview} alt="Preview" className="h-full w-full object-cover blur-[1px]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={24} className="animate-spin text-white" />
                        </div>
                    </div>
                ))}

                {fotos.length === 0 && fotosTemp.length === 0 && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#1E1E1E] transition-colors hover:border-[#CC0000]/50"
                    >
                        <Upload size={20} className="text-[#4B5563]" />
                        <span className="text-[10px] text-[#4B5563]">Upload</span>
                    </div>
                )}
            </div>
        </div>
    );
}
