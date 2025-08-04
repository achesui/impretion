import { Upload, File, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { useUpsertCollectionContentMutation } from "@/services/queries";
import { UserData } from "@base/shared-types";

const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
const MAX_INDIVIDUAL_TOTAL_SIZE = 4 * 1024 * 1024;

const allowedExtensions = [".md", ".markdown", ".txt"];

export function FilesUploader({
  userData,
  collectionId,
  collectionTotalSize,
  collectionTotalFiles,
}: {
  userData: UserData;
  collectionId: string;
  collectionTotalSize: number;
  collectionTotalFiles: number;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate } = useUpsertCollectionContentMutation({
    onSuccess: () => {},
    onError: (error) => {
      console.error("Upload error:", error);
      setUploadError(error.message || "Error al subir el archivo");
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFiles = (
    files: File[]
  ): { validFiles: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    files.forEach((file) => {
      // Validar formato
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        newErrors.push(
          `El archivo ${file.name} tiene un formato no soportado.`
        );
        return;
      }

      // Validar tamaño individual (4MB)
      if (file.size > MAX_INDIVIDUAL_TOTAL_SIZE) {
        newErrors.push(
          `El archivo ${file.name} es demasiado grande, asegúrate de subir archivos máximo de 4 MB.`
        );
        return;
      }

      validFiles.push(file);
    });

    return { validFiles, errors: newErrors };
  };

  const getTotalSize = (files: File[]): number => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  // Calcular el espacio disponible en la colección
  const getAvailableSpace = (): number => {
    const selectedFilesSize = getTotalSize(selectedFiles);
    return MAX_TOTAL_SIZE - collectionTotalSize - selectedFilesSize;
  };

  // Calcular el tamaño total que tendría la colección con los archivos seleccionados
  const getTotalCollectionSize = (): number => {
    const selectedFilesSize = getTotalSize(selectedFiles);
    return collectionTotalSize + selectedFilesSize;
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const { validFiles, errors: fileValidationErrors } =
      validateFiles(fileArray);

    // Errores informativos (no bloquean la subida de archivos válidos)
    const informationalErrors = [...fileValidationErrors];

    // Errores que SÍ bloquean (sobre archivos que están seleccionados)
    const blockingErrors: string[] = [];

    // Solo agregamos archivos válidos si no exceden límites
    let filesToAdd = validFiles;

    // Verificar límite de archivos (máximo 5 archivos seleccionados)
    const potentialFiles = [...selectedFiles, ...filesToAdd];
    if (potentialFiles.length > 5) {
      blockingErrors.push("Máximo 5 archivos permitidos");
      // Limitar archivos a agregar para no exceder el límite
      const availableSlots = 5 - selectedFiles.length;
      filesToAdd = validFiles.slice(0, availableSlots);
    }

    // Verificar límite de tamaño total de la colección
    const finalFiles = [...selectedFiles, ...filesToAdd];
    const finalSelectedSize = getTotalSize(finalFiles);
    const finalTotalCollectionSize = collectionTotalSize + finalSelectedSize;

    if (finalTotalCollectionSize > MAX_TOTAL_SIZE) {
      const availableSpace =
        MAX_TOTAL_SIZE - collectionTotalSize - getTotalSize(selectedFiles);
      blockingErrors.push(
        `Espacio insuficiente - disponible: ${formatFileSize(availableSpace)} de ${formatFileSize(MAX_TOTAL_SIZE - collectionTotalSize)} restantes`
      );

      // Intentar agregar archivos que quepan en el espacio disponible
      const fittingFiles: File[] = [];
      let accumulatedSize = getTotalSize(selectedFiles);

      for (const file of filesToAdd) {
        if (
          collectionTotalSize + accumulatedSize + file.size <=
          MAX_TOTAL_SIZE
        ) {
          fittingFiles.push(file);
          accumulatedSize += file.size;
        }
      }

      filesToAdd = fittingFiles;
    }

    // Agregar archivos válidos que no causen problemas
    if (filesToAdd.length > 0) {
      setSelectedFiles([...selectedFiles, ...filesToAdd]);
    }

    // Combinar errores informativos y bloqueantes
    const allErrors = [...informationalErrors, ...blockingErrors];
    setValidationErrors(allErrors);

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setValidationErrors([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const results = [];

      // Subir archivos uno por uno
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const key = `${collectionId}/${file.name}-${crypto.randomUUID()}`;
        formData.append("key", key);

        // Fetch a tu Worker endpoint
        const response = await fetch("/api/upload-to-r2", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error al subir ${file.name}`);
        }

        // Usar mutate con optimistic update
        mutate({
          type: "knowledgeBase",
          query: {
            method: "createOrDeleteCollectionContent",
            data: {
              operation: "create",
              values: {
                collectionId,
                key,
                name: file.name,
                size: file.size,
                createdBy: userData.userId,
                mimeType: file.type,
                createdAt: new Date(),
              },
            },
          },
          userData,
        });

        results.push({ success: true, file });
      }

      // Limpiar estado después de subida exitosa
      setSelectedFiles([]);
      setValidationErrors([]);
    } catch (error) {
      console.error("💥 Error en el proceso de subida:", error);
      setUploadError(
        error instanceof Error ? error.message : "Error desconocido"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = selectedFiles.length > 0 && !isUploading;
  const totalSelectedSize = getTotalSize(selectedFiles);
  const availableSpace = getAvailableSpace();
  const totalCollectionSize = getTotalCollectionSize();

  return (
    <div className="w-full space-y-3">
      {/* Zona de Drop - Compacta y ancha */}
      <div
        className={`
          relative duration-300 ease-in-out w-full
          border-2 border-dashed rounded-lg p-4 cursor-pointer
          shadow-sm hover:shadow-md h-20 border-slate-300 hover:border-slate-400
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedExtensions.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full transition-all duration-300">
              <Upload size={20} />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Haz clic para seleccionar tus archivos
              </p>
              <p className="text-xs text-slate-500">
                {allowedExtensions.join(", ")} • Máximo 4MB por archivo •
                Espacio disponible: {formatFileSize(availableSpace)} • Puedes
                subir máximo 5 archivos a la vez
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Información del uso de la colección */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Uso de la colección: {formatFileSize(totalCollectionSize)} /{" "}
            {formatFileSize(MAX_TOTAL_SIZE)}
          </span>
          <span className="text-slate-500">
            {((totalCollectionSize / MAX_TOTAL_SIZE) * 100).toFixed(1)}% usado
          </span>
          <span>{collectionTotalFiles} archivos</span>
        </div>
        <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              totalCollectionSize > MAX_TOTAL_SIZE * 0.8
                ? totalCollectionSize > MAX_TOTAL_SIZE * 0.9
                  ? "bg-red-500"
                  : "bg-yellow-500"
                : "bg-blue-500"
            }`}
            style={{
              width: `${Math.min((totalCollectionSize / MAX_TOTAL_SIZE) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Mostrar error de subida si existe */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={14} />
            <span className="font-medium">Error de subida:</span>
            <span className="text-red-600">{uploadError}</span>
          </div>
        </div>
      )}

      {/* Errores - Compacto */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={14} />
            <span className="text-red-600">{validationErrors.join(" • ")}</span>
          </div>
        </div>
      )}

      {/* Archivos seleccionados - Layout horizontal */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {selectedFiles.length} archivo
              {selectedFiles.length !== 1 ? "s" : ""} seleccionado
              {selectedFiles.length !== 1 ? "s" : ""} ({selectedFiles.length}/5)
            </span>
            <span className="text-xs text-slate-500">
              {formatFileSize(totalSelectedSize)} • Espacio restante:{" "}
              {formatFileSize(availableSpace)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Contenedor con scroll solo para archivos */}
            <div className="flex-1 flex items-center gap-3 overflow-x-auto pb-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group min-w-0"
                >
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                    <File size={14} />
                  </div>
                  <div className="min-w-0 max-w-32">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Botón fijo a la derecha */}
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className={`
                flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  canUpload
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }
              `}
            >
              <CheckCircle2 size={14} />
              {isUploading ? "Subiendo..." : "Subir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
