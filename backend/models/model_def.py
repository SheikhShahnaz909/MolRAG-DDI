"""
Model architecture — must be byte-for-byte identical to what you trained,
or load_state_dict() will fail or silently load into the wrong layers.
Copied from your v4 training notebook (ResNet50 fusion + CORAL ordinal head).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models


class CoralLayer(nn.Module):
    def __init__(self, in_features, num_classes):
        super().__init__()
        self.fc = nn.Linear(in_features, 1, bias=False)
        self.bias = nn.Parameter(torch.zeros(num_classes - 1))

    def forward(self, x):
        return self.fc(x) + self.bias


class DrugInteractionFusionCNN(nn.Module):
    def __init__(self, num_classes, n_chem_features):
        super().__init__()
        resnet = models.resnet50(weights=None)  # weights=None -- we're loading trained weights, not ImageNet
        self.encoder = nn.Sequential(*list(resnet.children())[:-1])
        img_feat_dim = resnet.fc.in_features

        self.chem_encoder = nn.Sequential(
            nn.Linear(n_chem_features, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 32),
            nn.ReLU()
        )

        fused_dim = (img_feat_dim + 32) * 2
        self.fc1 = nn.Linear(fused_dim, 256)
        self.fc2 = nn.Linear(256, 128)
        self.coral = CoralLayer(128, num_classes)
        self.dropout = nn.Dropout(0.3)

    def encode_drug(self, img, chem):
        img_emb = self.encoder(img).view(img.size(0), -1)
        chem_emb = self.chem_encoder(chem)
        return torch.cat([img_emb, chem_emb], dim=1)

    def forward(self, img_a, img_b, chem_a, chem_b):
        emb_a = self.encode_drug(img_a, chem_a)
        emb_b = self.encode_drug(img_b, chem_b)
        x = torch.cat([emb_a, emb_b], dim=1)
        x = self.dropout(torch.relu(self.fc1(x)))
        x = self.dropout(torch.relu(self.fc2(x)))
        return self.coral(x)


def coral_probabilities(logits):
    """
    Converts CORAL's ordinal threshold logits into per-class probabilities
    (Safe / Moderate / Severe), so the API can return a normal-looking
    probability distribution even though the model is ordinal, not softmax.

    logits: tensor of shape (1, num_classes - 1)
    Returns: dict {"safe": p0, "moderate": p1, "severe": p2}, predicted_index, confidence
    """
    probs_thresholds = torch.sigmoid(logits)[0]  # shape (num_classes-1,) e.g. [P(>Safe), P(>Moderate)]

    p_safe = 1 - probs_thresholds[0]
    p_moderate = probs_thresholds[0] - probs_thresholds[1]
    p_severe = probs_thresholds[1]

    class_probs = torch.stack([p_safe, p_moderate, p_severe])
    class_probs = torch.clamp(class_probs, min=0)          # guard against tiny negative values
    class_probs = class_probs / class_probs.sum()           # renormalize to sum to 1

    predicted_index = torch.sum(probs_thresholds > 0.5).item()
    confidence = round(class_probs[predicted_index].item() * 100, 2)

    return {
        "safe": round(class_probs[0].item(), 4),
        "moderate": round(class_probs[1].item(), 4),
        "severe": round(class_probs[2].item(), 4),
    }, predicted_index, confidence
