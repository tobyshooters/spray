# Preprocessing

Detect holds on a spray wall photo using SAM (Segment Anything Model).

## Setup

```
cd preprocessing
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

Download the SAM checkpoint (~2.5GB):

```
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth
```

## Usage

```
uv run python segment_holds.py wall.jpg --output holds.json
```

Upload `wall.jpg` and `holds.json` to your Supabase Storage bucket (public).
