import subprocess
import os
import sys
import logging
import threading
from datetime import datetime

logger = logging.getLogger(__name__)

def start_bots():
    """Lance les 3 bots Discord en arrière-plan."""
    if os.path.exists('/.dockerenv'):
        logger.info("🐳 Environnement Docker détecté. Le lancement des bots en subprocess est désactivé (géré par docker-compose).")
        return

    bots = [
        "discord_bot_Bank.py",
        "discord_bot_entreprise.py",
        "discord_bot.py"
    ]
    
    # Trouver le chemin racine du projet (3 niveaux au-dessus de ce fichier)
    # backend/app/services/discord_launcher.py -> backend/app/services -> backend/app -> backend -> root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    
    bot_dir = os.path.join(project_root, "discord-bot")
    
    if not os.path.exists(bot_dir):
        # Fallback pour Docker
        bot_dir = "/app/discord-bot" if os.path.exists("/app/discord-bot") else os.path.join(os.getcwd(), "discord-bot")

    logger.info(f"📁 Recherche des bots dans: {bot_dir}")

    # S'assurer que le dossier logs existe
    logs_dir = os.path.join(bot_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)

    for bot_script in bots:
        script_path = os.path.join(bot_dir, bot_script)
        if os.path.exists(script_path):
            logger.info(f"🚀 Lancement du bot Discord: {bot_script}")
            
            # Fichier de log pour ce bot
            log_file_path = os.path.join(logs_dir, f"{bot_script}.log")
            
            try:
                # Ouvrir le fichier de log en mode append
                log_file = open(log_file_path, "a", encoding="utf-8")
                log_file.write(f"\n--- Démarrage le {datetime.now()} ---\n")
                
                # Lancer dans un processus séparé
                subprocess.Popen([sys.executable, script_path], 
                                 cwd=bot_dir,
                                 stdout=log_file,
                                 stderr=log_file)
                logger.info(f"✅ Bot {bot_script} lancé avec succès. Logs: {log_file_path}")
            except Exception as e:
                logger.error(f"❌ Erreur lors du lancement de {bot_script}: {e}")
        else:
            logger.warning(f"⚠️ Script bot non trouvé: {script_path}")



def launch_bots_async():
    """Lance les bots dans un thread séparé pour ne pas bloquer le démarrage."""
    thread = threading.Thread(target=start_bots, daemon=True)
    thread.start()
