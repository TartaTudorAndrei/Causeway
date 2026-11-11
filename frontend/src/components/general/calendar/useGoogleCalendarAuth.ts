import { useState, useCallback } from 'react';

export function useGoogleCalendarAuth() {
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

    const handleGoogleAuthSuccess = useCallback((credential: string) => {
        setGoogleToken(credential);
        setIsGoogleConnected(true);
    }, []);

    const disconnect = useCallback(() => {
        setGoogleToken(null);
        setIsGoogleConnected(false);
    }, []);

    return {
        googleToken,
        isGoogleConnected,
        handleGoogleAuthSuccess,
        disconnect
    };
}
