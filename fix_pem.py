import sys
try:
    with open("civicbridge-frontend-key.pem", "rb") as f:
        content = f.read()
    try:
        text = content.decode("utf-16le")
        print("Decoded as utf-16le")
    except ValueError:
        text = content.decode("utf-8")
        print("Decoded as utf-8")

    # The AWS CLI text output might also have trailing/leading issues or quotes.
    if "-----BEGIN" not in text:
        print("Not a valid PEM file")
        sys.exit(1)

    # Re-write the file
    with open("key-fixed.pem", "wb") as f:
        f.write((text.strip() + "\n").encode("ascii"))
    
    print("Fixed PEM file saved as key-fixed.pem")
except Exception as e:
    print(f"Error: {e}")
