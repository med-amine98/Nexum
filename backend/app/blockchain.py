import hashlib

chain = []

def add_block(data):
    prev_hash = chain[-1]["hash"] if chain else "0"

    block = {
        "data": data,
        "prev_hash": prev_hash
    }

    block["hash"] = hashlib.sha256(str(block).encode()).hexdigest()

    chain.append(block)