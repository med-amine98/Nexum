import requests

def send_to_discord(message):
    webhook_url = "https://discord.com/api/webhooks/1490782996398084146/txdUxEXcSGAU9NrSDXrK6F30N8pIz2Ab_0cHcdlkISNzjgZpSGk7423nwUM5wX7nExjt"
    data = {
        "content": message
    }
    requests.post(webhook_url, json=data)