export interface RecaptchaVerificationResponse {
    success: boolean
    score?: number
    action?: string
    challenge_ts?: string
    hostname?: string
    "error-codes"?: string[]
}

export async function verifyRecaptchaToken(token: string) {
    const secret = process.env.RECAPTCHA_SECRET_KEY
    if (!secret) {
        throw new Error('RECAPTCHA_SECRET_KEY introuvable dans les variables d’environnement.')
    }

    const params = new URLSearchParams({
        secret,
        response: token,
    })

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString(),
    })

    const result = await response.json() as RecaptchaVerificationResponse
    return result
}
