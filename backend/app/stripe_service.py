# app/stripe_service.py
import os
import json
import stripe
from fastapi import APIRouter, HTTPException, Request
from typing import Optional

# ========== ROUTEUR AVEC LE BON PREFIXE ==========
# IMPORTANT: Votre api.js a baseURL = 'http://localhost:8000/api/v1'
# Donc le préfixe doit être "/stripe" pour que l'URL complète soit /api/v1/stripe/...
router = APIRouter(prefix="/stripe", tags=["Stripe Payment"])

# Load Stripe keys from env (test mode)
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

if not STRIPE_SECRET_KEY:
    print("⚠️ WARNING: STRIPE_SECRET_KEY not set in environment variables")
    STRIPE_SECRET_KEY = "sk_test_51TdWO7CqwQMJhbzhOCEB4cpj7vp6iIHEhtd2IG8HblEuhfIdENQG80vZykRc9whM8EZWLHrkj3d0rjWAwfBwG7AI00qJPDwLaZ"

stripe.api_key = STRIPE_SECRET_KEY


# ========== ENDPOINTS ==========

@router.post("/create-payment-intent")
async def create_payment_intent(request: Request):
    """
    Créer une intention de paiement Stripe
    URL: POST http://localhost:8000/api/v1/stripe/create-payment-intent
    """
    try:
        # Récupérer le corps de la requête
        body = await request.json()
        print(f"📥 Requête Stripe reçue: {json.dumps(body, indent=2, ensure_ascii=False)}")
        
        # Extraire les valeurs
        price_id = body.get("priceId")
        plan_id = body.get("planId", 1)
        plan_name = body.get("planName") or body.get("name") or "Premium"
        user_email = body.get("userEmail") or body.get("email")
        user_name = body.get("userName") or body.get("name") or "Utilisateur"
        amount_euros = body.get("amount") or body.get("total") or 79
        
        # Calculer le montant en centimes
        amount = int(float(amount_euros) * 100)
        
        # Si priceId est fourni, essayer de récupérer le prix Stripe
        if price_id and price_id.startswith('price_'):
            try:
                price = stripe.Price.retrieve(price_id)
                amount = price.unit_amount
                currency = price.currency
            except Exception as e:
                print(f"⚠️ Erreur récupération prix: {e}")
                currency = "eur"
        else:
            currency = "eur"
        
        print(f"💰 Création PaymentIntent: {amount/100}€ pour {plan_name}")
        print(f"   Email: {user_email}, Nom: {user_name}")
        
        # Créer l'intention de paiement
        intent_params = {
            "amount": amount,
            "currency": currency,
            "metadata": {
                "plan_id": str(plan_id),
                "plan_name": plan_name,
                "user_email": user_email or "unknown",
                "user_name": user_name,
                "source": "nexum_frontend"
            },
            "description": f"Abonnement {plan_name}"
        }
        
        if user_email:
            intent_params["receipt_email"] = user_email
        
        intent = stripe.PaymentIntent.create(**intent_params)
        
        print(f"✅ PaymentIntent créé: {intent.id}")
        
        return {
            "clientSecret": intent.client_secret,
            "paymentIntentId": intent.id,
            "amount": amount,
            "currency": currency
        }
        
    except json.JSONDecodeError as e:
        print(f"❌ Erreur JSON: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except stripe.error.StripeError as e:
        print(f"❌ Erreur Stripe: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Erreur générale: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/confirm-payment")
async def confirm_payment(request: Request):
    """
    Confirmer un paiement Stripe
    URL: POST http://localhost:8000/api/v1/stripe/confirm-payment
    """
    try:
        body = await request.json()
        payment_intent_id = body.get("paymentIntentId")
        
        if not payment_intent_id:
            raise HTTPException(status_code=400, detail="paymentIntentId is required")
        
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status == "succeeded":
            print(f"✅ Paiement confirmé: {payment_intent_id}")
            return {
                "success": True,
                "message": "Paiement confirmé avec succès",
                "paymentIntent": {
                    "id": intent.id,
                    "amount": intent.amount,
                    "currency": intent.currency,
                    "status": intent.status
                }
            }
        else:
            return {
                "success": False,
                "message": f"Statut du paiement: {intent.status}"
            }
            
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except stripe.error.StripeError as e:
        print(f"❌ Erreur Stripe: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Erreur générale: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-intent/{payment_intent_id}")
async def get_payment_intent(payment_intent_id: str):
    """
    Récupérer les détails d'une intention de paiement
    URL: GET http://localhost:8000/api/v1/stripe/payment-intent/{id}
    """
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
            "metadata": intent.metadata
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-session")
async def create_checkout_session(request: Request):
    """
    Créer une session de checkout Stripe
    URL: POST http://localhost:8000/api/v1/stripe/create-session
    """
    try:
        body = await request.json()
        price_id = body.get("price_id")
        success_url = body.get("success_url")
        cancel_url = body.get("cancel_url")
        
        if not price_id:
            raise HTTPException(status_code=400, detail="price_id is required")
        
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url or "http://localhost:3000/success",
            cancel_url=cancel_url or "http://localhost:3000/cancel",
            metadata={"source": "nexum_frontend"}
        )
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        print(f"❌ Erreur création session: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe
    URL: POST http://localhost:8000/api/v1/stripe/webhook
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            print(f"❌ Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            print(f"❌ Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        event = stripe.Event.construct_from(
            json.loads(payload.decode("utf-8")),
            stripe.api_key
        )
    
    event_type = event["type"]
    print(f"📨 Webhook reçu: {event_type}")
    
    return {"status": "received", "type": event_type}


@router.get("/test")
async def test_stripe():
    """
    Endpoint de test
    URL: GET http://localhost:8000/api/v1/stripe/test
    """
    try:
        stripe.Balance.retrieve()
        return {
            "status": "ok",
            "message": "Stripe is configured correctly",
            "api_key_loaded": bool(STRIPE_SECRET_KEY)
        }
    except stripe.error.AuthenticationError:
        return {
            "status": "error",
            "message": "Invalid Stripe API key",
            "api_key_loaded": bool(STRIPE_SECRET_KEY)
        }
    except Exception as e:
        return {
            "status": "ok",
            "message": "Stripe service is running",
            "api_key_loaded": bool(STRIPE_SECRET_KEY)
        }


@router.get("/health")
async def stripe_health():
    """
    Health check
    URL: GET http://localhost:8000/api/v1/stripe/health
    """
    return {
        "status": "healthy",
        "api_key_configured": bool(STRIPE_SECRET_KEY),
        "webhook_secret_configured": bool(STRIPE_WEBHOOK_SECRET)
    }