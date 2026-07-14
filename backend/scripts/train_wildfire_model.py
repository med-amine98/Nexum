
# scripts/train_wildfire_model.py
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from scripts.train_cnn_habitation import train_habitation

if __name__ == "__main__":
    model, history = train_habitation(
        data_dir="data_wildfire",
        epochs=50,
        batch_size=32,
        lr=0.001,
        model_name='resnet50'
    )
