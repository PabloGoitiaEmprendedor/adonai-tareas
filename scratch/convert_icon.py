import struct
import os

def png_to_ico(png_path, ico_path):
    if not os.path.exists(png_path):
        print(f"Error: {png_path} not found")
        return
    with open(png_path, 'rb') as f:
        png_data = f.read()
    
    # ICO Header
    # 0-1: Reserved (0)
    # 2-3: Type (1 for icon)
    # 4-5: Number of images (1)
    header = struct.pack('<HHH', 0, 1, 1)
    
    # Icon Directory Entry
    # 0: Width (0 means 256 or more)
    # 1: Height (0 means 256 or more)
    # 2: Color count (0)
    # 3: Reserved (0)
    # 4-5: Color planes (1)
    # 6-7: Bits per pixel (32)
    # 8-11: Size of image data
    # 12-15: Offset of image data
    width = 0 
    height = 0 
    entry = struct.pack('<BBBBHHII', width, height, 0, 0, 1, 32, len(png_data), 6 + 16)
    
    with open(ico_path, 'wb') as f:
        f.write(header)
        f.write(entry)
        f.write(png_data)
    print(f"Successfully created {ico_path} from {png_path}")

png_to_ico('public/logo.png', 'build/icon.ico')
png_to_ico('public/logo.png', 'public/favicon.ico')
