import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { ApiError, isAbortError, mapErrorCode } from "@/lib/errors";
import type { DecodeResult, Medium, Status } from "@/types";

export interface DecodeFlow {
  medium: Medium | null;
  file: File | null;
  stegoText: string;
  status: Status;
  error: string | null;
  result: DecodeResult | null;
  hasInput: boolean;
  canDecode: boolean;
  isSubmitting: boolean;
  step: 1 | 2 | 3 | 4;
  selectMedium: (medium: Medium) => void;
  chooseFile: (file: File) => void;
  removeFile: () => void;
  setStegoText: (text: string) => void;
  decode: () => Promise<void>;
  reset: () => void;
}

export function useDecodeFlow(): DecodeFlow {
  const [medium, setMedium] = useState<Medium | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stegoText, setStegoText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecodeResult | null>(null);

  const decodeAbortRef = useRef<AbortController | null>(null);

  const abortDecode = useCallback(() => {
    decodeAbortRef.current?.abort();
    decodeAbortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abortDecode();
    setMedium(null);
    setFile(null);
    setStegoText("");
    setStatus("idle");
    setError(null);
    setResult(null);
  }, [abortDecode]);

  // Abort in-flight decode requests on unmount / navigation.
  useEffect(() => () => decodeAbortRef.current?.abort(), []);

  const selectMedium = useCallback(
    (next: Medium) => {
      abortDecode();
      setMedium(next);
      setFile(null);
      setStegoText("");
      setStatus("idle");
      setError(null);
      setResult(null);
    },
    [abortDecode],
  );

  const chooseFile = useCallback(
    (next: File) => {
      abortDecode();
      setFile(next);
      setStatus("idle");
      setError(null);
      setResult(null);
    },
    [abortDecode],
  );

  const removeFile = useCallback(() => {
    abortDecode();
    setFile(null);
    setStatus("idle");
    setError(null);
    setResult(null);
  }, [abortDecode]);

  const updateStegoText = useCallback(
    (text: string) => {
      setStegoText(text);
      if (status === "error") setStatus("idle");
    },
    [status],
  );

  const hasInput = useMemo(() => {
    if (!medium) return false;
    if (medium === "text") return stegoText.trim().length > 0;
    return file !== null;
  }, [medium, stegoText, file]);

  const canDecode = status !== "loading" && hasInput;

  const decode = useCallback(async () => {
    if (!medium || status === "loading") return;
    if (medium === "text") {
      if (stegoText.trim().length === 0) return;
    } else if (!file) {
      return;
    }

    abortDecode();
    const controller = new AbortController();
    decodeAbortRef.current = controller;
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      let decoded: DecodeResult;
      if (medium === "image") {
        decoded = await api.decodeImage(file as File, controller.signal);
      } else if (medium === "audio") {
        decoded = await api.decodeAudio(file as File, controller.signal);
      } else {
        decoded = await api.decodeText(stegoText, controller.signal);
      }
      if (controller.signal.aborted) return;
      setResult(decoded);
      setStatus("success");
    } catch (cause: unknown) {
      if (isAbortError(cause)) return;
      setStatus("error");
      setError(
        cause instanceof ApiError
          ? mapErrorCode(cause.code, medium, cause.message)
          : mapErrorCode("INTERNAL_ERROR", medium),
      );
    } finally {
      if (decodeAbortRef.current === controller) {
        decodeAbortRef.current = null;
      }
    }
  }, [medium, status, file, stegoText, abortDecode]);

  const step: 1 | 2 | 3 | 4 = useMemo(() => {
    if (status === "success") return 4;
    if (!medium) return 1;
    if (!hasInput) return 2;
    return 3;
  }, [status, medium, hasInput]);

  return {
    medium,
    file,
    stegoText,
    status,
    error,
    result,
    hasInput,
    canDecode,
    isSubmitting: status === "loading",
    step,
    selectMedium,
    chooseFile,
    removeFile,
    setStegoText: updateStegoText,
    decode,
    reset,
  };
}
