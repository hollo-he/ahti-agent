import os
from config import settings

def check():
    print(f"Current Working Directory: {os.getcwd()}")
    print(f"ZHIPU_API_KEY from settings: '{settings.ZHIPU_API_KEY}'")
    print(f"ZHIPU_API_KEY length: {len(settings.ZHIPU_API_KEY)}")
    
    if os.path.exists(".env"):
        print(".env file found in CWD")
    else:
        print(".env file NOT found in CWD")
        # Try parent directory
        if os.path.exists("../.env"):
            print(".env file found in parent directory")

if __name__ == "__main__":
    check()