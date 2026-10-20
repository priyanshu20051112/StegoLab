import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { ApiError, isAbortError, mapErrorCode } from "@/lib/errors";
import { createObjectURL, revokeObjectURL } from "@/lib/download";
import { utf8ByteLength } from "@/lib/format";
import type {
  Capacity,
  EncodeSuccess,
  Medium,
  Status,
} from "@/types";

export interface EncodeFlow {
  medium: Medium | null;
  file: File | null;
  coverText: string;
  message: string;
  capacity: Capacity | null;
  capacityLoading: boolean;
  capacityError: string | null;
  status: Status;
  error: string | null;
  result: EncodeSuccess | null;
  messageBytes: number;
  hasMedia: boolean;
  isOverCapacity: boolean;
  canEncode: boolean;
  isSubmitting: boolean;
  step: 1 | 2 | 3 | 4 | 5;
  selectMedium: (medium: Medium) => void;
  chooseFile: (file: File) => void;
  removeFile: () => void;
  setCoverText: (text: string) => void;
  setMessage: (text: string) => void;
  encode: () => Promise<void>;
  reset: () => void;
}

export function useEncodeFlow(): EncodeFlow {
  const [medium, setMedium] = useState<Medium | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [coverText, setCoverText] = useState("");
  const [message, setMessage] = useState("");
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EncodeSuccess | null>(null);

  const encodeAbortRef = useRef<AbortController | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const originalUrlRef = useRef<string | null>(null);

  const abortEncode = useCallback(() => {
    encodeAbortRef.current?.abort();
    encodeAbortRef.current = null;
  }, []);

  const clearResult = useCallback(() => {
    revokeObjectURL(resultUrlRef.current);
    revokeObjectURL(originalUrlRef.current);
    resultUrlRef.current = null;
    originalUrlRef.current = null;
    setResult(null);
  }, []);

  const reset = useCallback(() => {
    abortEncode();
    clearResult();
    setMedium(null);
    setFile(null);
    setCoverText("");
    setMessage("");
    setCapacity(null);
    setCapacityLoading(false);
    setCapacityError(null);
    setStatus("idle");
    setError(null);
  }, [abortEncode, clearResult]);

  // Abort in-flight work and revoke object URLs on unmount / navigation.
  useEffect(
    () => () => {
      encodeAbortRef.current?.abort();
      revokeObjectURL(resultUrlRef.current);
      revokeObjectURL(originalUrlRef.current);
    },
    [],
  );

  const selectMedium = useCallback(
    (next: Medium) => {
      abortEncode();
      clearResult();
      setMedium(next);
      setFile(null);
      setCoverText("");
      setCapacity(null);
      setCapacityLoading(false);
      setCapacityError(null);
      setStatus("idle");
      setError(null);
    },
    [abortEncode, clearResult],
  );

  const chooseFile = useCallback(
    (next: File) => {
      abortEncode();
      clearResult();
      setFile(next);
      setStatus("idle");
      setError(null);
    },
    [abortEncode, clearResult],
  );

  const removeFile = useCallback(() => {
    abortEncode();
    clearResult();
    setFile(null);
    setCapacity(null);
    setCapacityLoading(false);
    setCapacityError(null);
    setStatus("idle");
    setError(null);
  }, [abortEncode, clearResult]);

  const updateCoverText = useCallback((text: string) => {
    setCoverText(text);
    if (status === "error") setStatus("idle");
  }, [status]);

  const updateMessage = useCallback(
    (text: string) => {
      setMessage(text);
      if (status === "error") setStatus("idle");
    },
    [status],
  );

  // Fetch capacity for image/audio whenever the input file changes.
  useEffect(() => {
    if (!file || !medium || medium === "text") {
      setCapacity(null);
      setCapacityLoading(false);
      setCapacityError(null);
      return;
    }
    const controller = new AbortController();
    setCapacity(null);
    setCapacityError(null);
    setCapacityLoading(true);
    const fetchCapacity =
      medium === "image" ? api.getImageCapacity : api.getAudioCapacity;
    fetchCapacity(file, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setCapacity(value);
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return;
        setCapacityError(
          cause instanceof ApiError
            ? mapErrorCode(cause.code, medium, cause.message)
            : mapErrorCode("INTERNAL_ERROR", medium),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCapacityLoading(false);
      });
    return () => controller.abort();
  }, [file, medium]);

  const messageBytes = useMemo(() => utf8ByteLength(message), [message]);

  const hasMedia = useMemo(() => {
    if (!medium) return false;
    if (medium === "text") return coverText.trim().length > 0;
    return file !== null;
  }, [medium, coverText, file]);

  const isOverCapacity =
    capacity !== null && messageBytes > capacity.capacity_bytes;

  const canEncode =
    status !== "loading" &&
    hasMedia &&
    message.trim().length > 0 &&
    !isOverCapacity &&
    !capacityLoading;

  const encode = useCallback(async () => {
    if (!medium || status === "loading") return;
    if (medium === "text") {
      if (coverText.trim().length === 0) {
        setStatus("error");
        setError(mapErrorCode("EMPTY_COVER_TEXT"));
        return;
      }
    } else if (!file) {
      return;
    }
    if (message.trim().length === 0) {
      setStatus("error");
      setError(mapErrorCode("EMPTY_MESSAGE"));
      return;
    }

    abortEncode();
    clearResult();
    const controller = new AbortController();
    encodeAbortRef.current = controller;
    setStatus("loading");
    setError(null);

    try {
      if (medium === "image" || medium === "audio") {
        const input = file as File;
        const binary =
          medium === "image"
            ? await api.encodeImage(input, message, controller.signal)
            : await api.encodeAudio(input, message, controller.signal);
        const originalUrl = createObjectURL(input);
        const stegoUrl = createObjectURL(binary.blob);
        resultUrlRef.current = stegoUrl;
        originalUrlRef.current = originalUrl;
        setResult({
          medium,
          filename: binary.filename,
          blob: binary.blob,
          url: stegoUrl,
          originalUrl,
          text: null,
          capacityNote: null,
          capacityBytes: binary.capacityBytes,
          messageBytes: binary.messageBytes ?? utf8ByteLength(message),
          originalSize: input.size,
        });
      } else {
        const text = await api.encodeText(coverText, message, controller.signal);
        setResult({
          medium: "text",
          filename: "stegolab_encoded.txt",
          blob: new Blob([text.stego_text], {
            type: "text/plain;charset=utf-8",
          }),
          url: null,
          originalUrl: null,
          text: text.stego_text,
          capacityNote: text.capacity_note ?? null,
          capacityBytes: null,
          messageBytes: utf8ByteLength(message),
          originalSize: null,
        });
      }
      if (!controller.signal.aborted) setStatus("success");
    } catch (cause: unknown) {
      if (isAbortError(cause)) return;
      setStatus("error");
      setError(
        cause instanceof ApiError
          ? mapErrorCode(cause.code, medium, cause.message)
          : mapErrorCode("INTERNAL_ERROR", medium),
      );
    } finally {
      if (encodeAbortRef.current === controller) {
        encodeAbortRef.current = null;
      }
    }
  }, [
    medium,
    status,
    file,
    message,
    coverText,
    abortEncode,
    clearResult,
  ]);

  const step: 1 | 2 | 3 | 4 | 5 = useMemo(() => {
    if (status === "success") return 5;
    if (!medium) return 1;
    if (!hasMedia) return 2;
    if (status === "loading" || status === "error") return 4;
    return 3;
  }, [status, medium, hasMedia]);

  return {
    medium,
    file,
    coverText,
    message,
    capacity,
    capacityLoading,
    capacityError,
    status,
    error,
    result,
    messageBytes,
    hasMedia,
    isOverCapacity,
    canEncode,
    isSubmitting: status === "loading",
    step,
    selectMedium,
    chooseFile,
    removeFile,
    setCoverText: updateCoverText,
    setMessage: updateMessage,
    encode,
    reset,
  };
}
