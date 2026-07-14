// StripeSubscribeButton.jsx
import React, { useState } from "react";
import { Button, message, Modal } from "antd";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Load Stripe with a publishable key (to be set in .env and injected at build time)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const StripeSubscribeButton = () => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/v1/stripe/create-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}) // backend can infer user from auth token
        }
      );
      if (!response.ok) throw new Error("Failed to create Stripe session");
      const { url } = await response.json();
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: url });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      message.error("Subscription could not be started: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      loading={loading}
      onClick={handleSubscribe}
      style={{ borderRadius: 8, background: "linear-gradient(135deg, #ff7e5f, #feb47b)" }}
    >
      Subscribe Now
    </Button>
  );
};

export default StripeSubscribeButton;
