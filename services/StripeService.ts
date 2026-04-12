// StripeService provides methods for handling payments and subscriptions
export const StripeService = {
    async createCheckoutSession(userId: string, priceId: string) {
        try {
            // Point to the Vercel Serverless Function
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, priceId }),
            });

            const { url, error } = await response.json();
            if (error) throw new Error(error);

            // Redirect to Stripe Checkout
            window.location.href = url;
        } catch (err) {
            console.error('Checkout error:', err);
            throw err;
        }
    },

    async manageSubscription(customerId: string) {
        try {
            const response = await fetch('/api/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId }),
            });

            const { url } = await response.json();
            window.location.href = url;
        } catch (err) {
            console.error('Portal error:', err);
            throw err;
        }
    }
};
