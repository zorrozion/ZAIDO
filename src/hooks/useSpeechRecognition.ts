import { useEffect, useRef, useState, useCallback } from 'react';

// 声明全局 SpeechRecognition 兼容类型
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface UseSpeechRecognitionOptions {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
  autoRestart?: boolean;
}

export function useSpeechRecognition({
  onInterimResult,
  onFinalResult,
  onError,
  autoRestart = true
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 区分用户主动停止和浏览器意外结束
  const shouldListenRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const retryCountRef = useRef(0);

  // 保存最新的回调引用，避免闭包过时
  const callbacksRef = useRef({ onInterimResult, onFinalResult, onError });
  useEffect(() => {
    callbacksRef.current = { onInterimResult, onFinalResult, onError };
  }, [onInterimResult, onFinalResult, onError]);

  // 初始化检查
  useEffect(() => {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechClass) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setErrorMessage('当前浏览器暂不支持语音识别。建议使用最新版 Chrome 或 Edge。');
    }
  }, []);

  const createRecognitionInstance = useCallback(() => {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) return null;

    try {
      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
        retryCountRef.current = 0;
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalText && callbacksRef.current.onFinalResult) {
          callbacksRef.current.onFinalResult(finalText);
        }
        if (interimText && callbacksRef.current.onInterimResult) {
          callbacksRef.current.onInterimResult(interimText);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('SpeechRecognition error:', error);

        if (error === 'not-allowed') {
          setPermissionDenied(true);
          shouldListenRef.current = false;
          setIsListening(false);
          const msg = '无法访问麦克风。请允许浏览器使用麦克风权限后重试。';
          setErrorMessage(msg);
          callbacksRef.current.onError?.(msg);
          return;
        }

        if (error === 'audio-capture') {
          const msg = '未找到可用的麦克风硬件，请检查音频输入设备。';
          setErrorMessage(msg);
          callbacksRef.current.onError?.(msg);
          return;
        }

        if (error === 'no-speech') {
          // 属于正常静音间歇，不视为致命错误
          return;
        }

        // 其余网络或 ASR 服务暂态错误
        if (error !== 'aborted') {
          setErrorMessage(`语音识别提示: ${error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);

        // 如果用户仍然处于收音意图，自动重连唤醒
        if (shouldListenRef.current && autoRestart) {
          if (retryCountRef.current < 20) {
            retryCountRef.current++;
            clearTimeout(restartTimerRef.current);
            // 延时 200ms 重启，防止浏览器限制高频反复启动
            restartTimerRef.current = setTimeout(() => {
              if (shouldListenRef.current) {
                try {
                  recognition.start();
                } catch {
                  // 若实例已失效，重新构建
                  startListening();
                }
              }
            }, 250);
          } else {
            setErrorMessage('语音识别连续重启次数过多，已暂停，请点击麦克风重新激活。');
          }
        }
      };

      return recognition;
    } catch (e: any) {
      console.error('Failed to create SpeechRecognition instance:', e);
      return null;
    }
  }, [autoRestart]);

  const startListening = useCallback(() => {
    setPermissionDenied(false);
    setErrorMessage(null);
    shouldListenRef.current = true;
    retryCountRef.current = 0;

    if (!recognitionRef.current) {
      recognitionRef.current = createRecognitionInstance();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        // 如果已经 started，捕获即可
        if (err.name !== 'InvalidStateError') {
          console.warn('Recognition start exception:', err);
        }
      }
    }
  }, [createRecognitionInstance]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }
    setIsListening(false);
  }, []);

  // 组件卸载时释放资源
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    permissionDenied,
    errorMessage,
    startListening,
    stopListening
  };
}
