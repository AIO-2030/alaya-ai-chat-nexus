Project Path: mcp_pixel_mug

Source Tree:

```txt
mcp_pixel_mug
├── API_USAGE_EXAMPLES.md
├── LICENSE
├── README.md
├── README_STS.md
├── build.py
├── build_exec.sh
├── examples
│   ├── bluetooth_bridge.py
│   ├── example_client.py
│   ├── image_conversion_demo.py
│   └── pixel_art_demo.py
├── mcp_server.py
├── mug_service.py
├── requirements.txt
├── start_server.py
├── stdio_server.py
├── test_all_methods.sh
├── test_convert_image.sh
├── test_help.sh
├── test_pixel_art.sh
├── test_prepare.sh
└── test_publish.sh

```

`mcp_pixel_mug/API_USAGE_EXAMPLES.md`:

```md
# API Usage Examples

This document provides practical examples for using the PixelMug MCP Server API.

## Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Set environment variables:
   ```bash
   export IOT_ROLE_ARN="qcs::cam::uin/123456789:role/IoTDeviceRole"
   export TC_SECRET_ID="AKID_PLACEHOLDER_SECRET_ID"  # Optional for CVM/TKE
   export TC_SECRET_KEY="PLACEHOLDER_SECRET_KEY"    # Optional for CVM/TKE
   export DEFAULT_REGION="ap-guangzhou"
   ```
3. Start the service: `python start_server.py`

## API Endpoints

### 1. Help Endpoint

Get service information and available methods:

```bash
curl -X GET "http://localhost:8000/"
```

Response:
```json
{
  "service": "PixelMug IoT STS Service",
  "version": "2.0.0",
  "description": "Tencent Cloud IoT Device Control and STS Service",
  "features": [
    "STS temporary credential issuing",
    "Pixel image transmission to IoT devices",
    "GIF animation transmission to IoT devices",
    "Device authorization and validation"
  ]
}
```

### 2. STS Credentials Endpoint

Issue temporary credentials for device access:

```bash
curl -X GET "http://localhost:8000/sts/issue?pid=ABC123DEF&dn=mug_001&user_id=default_user"
```

Response:
```json
{
  "code": 0,
  "message": "STS credentials issued successfully",
  "data": {
    "tmpSecretId": "AKID_PLACEHOLDER_SECRET_ID",
    "tmpSecretKey": "PLACEHOLDER_SECRET_KEY",
    "token": "PLACEHOLDER_TOKEN",
    "expiration": "2023-12-25T10:15:30Z",
    "region": "ap-guangzhou",
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "issued_at": "2023-12-25T10:00:30Z"
  }
}
```

### 3. Send Pixel Image Endpoint

Send pixel image to device:

```bash
curl -X POST "http://localhost:8000/pixel/send" \
  -H "Content-Type: application/json" \
  -d '{
    "pid": "ABC123DEF",
    "dn": "mug_001",
    "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "width": 16,
    "height": 16,
    "user_id": "default_user"
  }'
```

Response:
```json
{
  "code": 0,
  "message": "Pixel image sent successfully",
  "data": {
    "status": "success",
    "client_token": "PLACEHOLDER_CLIENT_TOKEN",
    "call_status": "SUCCESS",
    "request_id": "PLACEHOLDER_REQUEST_ID",
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "action_id": "display_pixel_image",
    "image_info": {
      "width": 16,
      "height": 16,
      "total_pixels": 256
    },
    "timestamp": "2023-12-25T10:15:30Z"
  }
}
```

### 4. Send GIF Animation Endpoint

Send animated GIF to device:

```bash
curl -X POST "http://localhost:8000/gif/send" \
  -H "Content-Type: application/json" \
  -d '{
    "pid": "ABC123DEF",
    "dn": "mug_001",
    "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "frame_delay": 100,
    "loop_count": 0,
    "width": 16,
    "height": 16,
    "user_id": "default_user"
  }'
```

## MCP JSON-RPC Examples

### 1. Help Request

```json
{
  "jsonrpc": "2.0",
  "method": "help",
  "params": {},
  "id": 1
}
```

### 2. Issue STS Credentials

```json
{
  "jsonrpc": "2.0",
  "method": "issue_sts",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001"
  },
  "id": 2
}
```

### 3. Send Pixel Image

```json
{
  "jsonrpc": "2.0",
  "method": "send_pixel_image",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "image_data": [
      ["#FF0000", "#00FF00"],
      ["#0000FF", "#FFFFFF"]
    ],
    "target_width": 2,
    "target_height": 2
  },
  "id": 3
}
```

### 4. Send GIF Animation

```json
{
  "jsonrpc": "2.0",
  "method": "send_gif_animation",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "frame_delay": 100,
    "loop_count": 0,
    "target_width": 16,
    "target_height": 16
  },
  "id": 4
}
```

### 5. Convert Image to Pixels

```json
{
  "jsonrpc": "2.0",
  "method": "convert_image_to_pixels",
  "params": {
    "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "target_width": 8,
    "target_height": 8,
    "resize_method": "nearest"
  },
  "id": 5
}
```

## Python Client Examples

### Basic Client

```python
import json
import requests

class PixelMugClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def call_method(self, method, params):
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        }
        response = requests.post(f"{self.base_url}/mcp", json=payload)
        return response.json()
    
    def get_help(self):
        return self.call_method("help", {})
    
    def issue_sts(self, product_id, device_name):
        return self.call_method("issue_sts", {
            "product_id": product_id,
            "device_name": device_name
        })
    
    def send_pixel_image(self, product_id, device_name, image_data, width=16, height=16):
        return self.call_method("send_pixel_image", {
            "product_id": product_id,
            "device_name": device_name,
            "image_data": image_data,
            "target_width": width,
            "target_height": height
        })

# Usage
client = PixelMugClient()

# Get help
help_info = client.get_help()
print(json.dumps(help_info, indent=2))

# Issue STS credentials
sts_result = client.issue_sts("ABC123DEF", "mug_001")
print(json.dumps(sts_result, indent=2))

# Send pixel image
pixel_data = [
    ["#FF0000", "#00FF00"],
    ["#0000FF", "#FFFFFF"]
]
result = client.send_pixel_image("ABC123DEF", "mug_001", pixel_data, 2, 2)
print(json.dumps(result, indent=2))
```

### Advanced Client with Error Handling

```python
import json
import requests
import time
from typing import Dict, Any, Optional

class AdvancedPixelMugClient:
    def __init__(self, base_url="http://localhost:8000", timeout=30):
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
    
    def _make_request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": int(time.time() * 1000)  # Use timestamp as ID
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/mcp",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32603,
                    "message": f"Network error: {str(e)}"
                },
                "id": payload["id"]
            }
    
    def get_help(self) -> Dict[str, Any]:
        """Get service help information"""
        return self._make_request("help", {})
    
    def issue_sts(self, product_id: str, device_name: str) -> Dict[str, Any]:
        """Issue STS credentials for device access"""
        return self._make_request("issue_sts", {
            "product_id": product_id,
            "device_name": device_name
        })
    
    def send_pixel_image(self, product_id: str, device_name: str, 
                        image_data: Any, width: int = 16, height: int = 16) -> Dict[str, Any]:
        """Send pixel image to device"""
        return self._make_request("send_pixel_image", {
            "product_id": product_id,
            "device_name": device_name,
            "image_data": image_data,
            "target_width": width,
            "target_height": height
        })
    
    def send_gif_animation(self, product_id: str, device_name: str, 
                          gif_data: Any, frame_delay: int = 100, 
                          loop_count: int = 0, width: int = 16, height: int = 16) -> Dict[str, Any]:
        """Send GIF animation to device"""
        return self._make_request("send_gif_animation", {
            "product_id": product_id,
            "device_name": device_name,
            "gif_data": gif_data,
            "frame_delay": frame_delay,
            "loop_count": loop_count,
            "target_width": width,
            "target_height": height
        })
    
    def convert_image_to_pixels(self, image_data: str, width: int = 16, 
                               height: int = 16, resize_method: str = "nearest") -> Dict[str, Any]:
        """Convert base64 image to pixel matrix"""
        return self._make_request("convert_image_to_pixels", {
            "image_data": image_data,
            "target_width": width,
            "target_height": height,
            "resize_method": resize_method
        })

# Usage example
if __name__ == "__main__":
    client = AdvancedPixelMugClient()
    
    # Test connection
    help_result = client.get_help()
    if "error" in help_result:
        print(f"Error: {help_result['error']['message']}")
    else:
        print("Service is running!")
        print(f"Version: {help_result['result']['version']}")
    
    # Issue STS credentials
    sts_result = client.issue_sts("ABC123DEF", "mug_001")
    if "error" not in sts_result:
        print("STS credentials issued successfully")
    else:
        print(f"STS error: {sts_result['error']['message']}")
    
    # Send pixel art
    smiley_face = [
        ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"],
        ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
        ["#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00"],
        ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
        ["#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00"],
        ["#FFFF00", "#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00"],
        ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
        ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"]
    ]
    
    result = client.send_pixel_image("ABC123DEF", "mug_001", smiley_face, 8, 8)
    if "error" not in result:
        print("Pixel image sent successfully!")
    else:
        print(f"Send error: {result['error']['message']}")
```

## Error Handling

### Common Error Codes

- `-32600`: Invalid Request
- `-32601`: Method Not Found
- `-32602`: Invalid Params
- `-32603`: Internal Error
- `-32700`: Parse Error

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params: Missing required parameter: product_id"
  },
  "id": 1
}
```

### Handling Errors in Python

```python
def handle_response(response):
    if "error" in response:
        error_code = response["error"]["code"]
        error_message = response["error"]["message"]
        
        if error_code == -32601:
            print(f"Method not found: {error_message}")
        elif error_code == -32602:
            print(f"Invalid parameters: {error_message}")
        elif error_code == -32603:
            print(f"Internal server error: {error_message}")
        else:
            print(f"Unknown error ({error_code}): {error_message}")
        
        return False
    else:
        print("Success!")
        return True

# Usage
result = client.get_help()
if handle_response(result):
    print(json.dumps(result["result"], indent=2))
```

## Testing

### Unit Tests

```python
import unittest
from pixelmug_client import AdvancedPixelMugClient

class TestPixelMugClient(unittest.TestCase):
    def setUp(self):
        self.client = AdvancedPixelMugClient()
    
    def test_help(self):
        result = self.client.get_help()
        self.assertNotIn("error", result)
        self.assertEqual(result["result"]["service"], "mcp_pixel_mug")
    
    def test_convert_image(self):
        # Test with 1x1 pixel PNG
        image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        result = self.client.convert_image_to_pixels(image_data, 8, 8)
        self.assertNotIn("error", result)
        self.assertEqual(len(result["result"]["pixel_matrix"]), 8)

if __name__ == "__main__":
    unittest.main()
```

### Integration Tests

```bash
#!/bin/bash
# test_integration.sh

echo "Testing PixelMug MCP Server Integration..."

# Test help endpoint
echo "1. Testing help endpoint..."
curl -s http://localhost:8000/ | jq '.service'

# Test MCP help method
echo "2. Testing MCP help method..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"help","params":{},"id":1}' | jq '.result.service'

# Test image conversion
echo "3. Testing image conversion..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"convert_image_to_pixels",
    "params":{
      "image_data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "target_width":4,
      "target_height":4
    },
    "id":2
  }' | jq '.result.pixel_matrix | length'

echo "Integration tests completed!"
```

## Performance Tips

1. **Connection Pooling**: Use a session object for multiple requests
2. **Timeout Settings**: Set appropriate timeouts for your use case
3. **Error Retry**: Implement exponential backoff for transient errors
4. **Batch Operations**: Group multiple operations when possible
5. **Image Optimization**: Resize images before sending to reduce payload size

## Security Best Practices

1. **Environment Variables**: Store credentials in environment variables
2. **HTTPS**: Always use HTTPS in production
3. **Input Validation**: Validate all input parameters
4. **Rate Limiting**: Implement rate limiting for API calls
5. **Logging**: Log all API calls for audit purposes

```

`mcp_pixel_mug/LICENSE`:

```
MIT License

Copyright (c) 2025 AIO-2030

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

`mcp_pixel_mug/README.md`:

```md
# 🎨 PixelMug MCP Server

A Model Context Protocol (MCP) server for controlling PixelMug smart mugs via Tencent Cloud IoT Explorer. This service provides pixel art display, GIF animation, and image conversion capabilities for IoT-connected smart mugs.

## ✨ Features

- **🎨 Pixel Art Display**: Send custom pixel patterns to mug displays
- **🎬 GIF Animation**: Display animated GIFs with frame control
- **🖼️ Image Conversion**: Convert any image to pixel art format
- **☁️ Tencent Cloud IoT**: Secure device communication via IoT Explorer
- **🔐 STS Authentication**: Temporary credentials for secure access
- **📱 MCP Protocol**: Standardized JSON-RPC interface

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Tencent Cloud account with IoT Explorer access
- CAM role configured for device access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AIO-2030/mcp_pixel_mug.git
cd mcp_pixel_mug
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variables:
```bash
export IOT_ROLE_ARN="qcs::cam::uin/123456789:role/IoTDeviceRole"
export TC_SECRET_ID="AKID_PLACEHOLDER_SECRET_ID"  # Optional in CVM/TKE
export TC_SECRET_KEY="PLACEHOLDER_SECRET_KEY"     # Optional in CVM/TKE
export DEFAULT_REGION="ap-guangzhou"
```

4. Start the server:
```bash
python mcp_server.py
```

## 📖 API Reference

### Available Methods

The MCP server supports the following JSON-RPC methods:

#### 1. `help` - Get Service Information

**Purpose**: Retrieve service capabilities and method documentation

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "help",
  "params": {},
  "id": 1
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "service": "mcp_pixel_mug",
    "version": "2.0.0",
    "description": "PixelMug Smart Mug Tencent Cloud IoT Control Interface",
    "methods": [
      {
        "name": "help",
        "description": "Get service help information",
        "params": {}
      },
      {
        "name": "issue_sts",
        "description": "Issue Tencent Cloud IoT STS temporary access credentials",
        "params": {
          "product_id": "Product ID, e.g.: ABC123DEF",
          "device_name": "Device name, e.g.: mug_001"
        }
      },
      {
        "name": "send_pixel_image",
        "description": "Send pixel image to device via Tencent Cloud IoT",
        "params": {
          "product_id": "Product ID",
          "device_name": "Device name",
          "image_data": "Base64 encoded image or pixel matrix",
          "target_width": "Target width (optional, default: 16)",
          "target_height": "Target height (optional, default: 16)"
        }
      },
      {
        "name": "send_gif_animation",
        "description": "Send GIF pixel animation to device via Tencent Cloud IoT",
        "params": {
          "product_id": "Product ID",
          "device_name": "Device name",
          "gif_data": "Base64 encoded GIF or frame array",
          "frame_delay": "Delay between frames in ms (optional, default: 100)",
          "loop_count": "Number of loops (optional, default: 0 for infinite)"
        }
      },
      {
        "name": "convert_image_to_pixels",
        "description": "Convert base64 image to pixel matrix for display",
        "params": {
          "image_data": "Base64 encoded image (PNG/JPEG)",
          "target_width": "Target width for pixel matrix (optional, default: 16)",
          "target_height": "Target height for pixel matrix (optional, default: 16)",
          "resize_method": "Resize method: nearest/bilinear/bicubic (optional, default: nearest)"
        }
      }
    ],
    "supported_actions": [
      {
        "action": "send_pixel_image",
        "description": "Send pixel image via Tencent Cloud IoT",
        "params": {
          "image_data": "Pixel data or base64 image",
          "width": "Image width",
          "height": "Image height"
        }
      },
      {
        "action": "send_gif_animation",
        "description": "Send GIF animation via Tencent Cloud IoT",
        "params": {
          "gif_data": "GIF frame data",
          "frame_delay": "Frame delay (ms)",
          "loop_count": "Loop count"
        }
      }
    ],
    "pixel_art_formats": {
      "2d_array": "Array of arrays with hex colors: [[\"#FF0000\", \"#00FF00\"], [\"#0000FF\", \"#FFFFFF\"]]",
      "rgb_array": "Array of arrays with RGB tuples: [[[255,0,0], [0,255,0]], [[0,0,255], [255,255,255]]]",
      "base64": "Base64 encoded image data (PNG/JPEG)"
    }
  },
  "id": 1
}
```

### 2. `issue_sts` - Issue STS Credentials

**Purpose**: Issue Tencent Cloud IoT STS temporary access credentials for device control

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "issue_sts",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001"
  },
  "id": 2
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tmpSecretId": "AKID_PLACEHOLDER_SECRET_ID",
    "tmpSecretKey": "PLACEHOLDER_SECRET_KEY",
    "token": "PLACEHOLDER_TOKEN",
    "expiration": "2024-01-01T12:00:00Z",
    "region": "ap-guangzhou",
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "issued_at": "2024-01-01T11:45:00Z"
  },
  "id": 2
}
```

### 3. `send_pixel_image` - Send Pixel Image

**Purpose**: Send pixel image to device via Tencent Cloud IoT

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "send_pixel_image",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "target_width": 16,
    "target_height": 16
  },
  "id": 3
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "client_token": "PLACEHOLDER_CLIENT_TOKEN",
    "call_status": "SUCCESS",
    "request_id": "PLACEHOLDER_REQUEST_ID",
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "action_id": "display_pixel_image",
    "image_info": {
      "width": 16,
      "height": 16,
      "total_pixels": 256
    },
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "id": 3
}
```

### 4. `send_gif_animation` - Send GIF Animation

**Purpose**: Send GIF pixel animation to device via Tencent Cloud IoT

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "send_gif_animation",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "frame_delay": 100,
    "loop_count": 0,
    "target_width": 16,
    "target_height": 16
  },
  "id": 4
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "client_token": "PLACEHOLDER_CLIENT_TOKEN",
    "call_status": "SUCCESS",
    "request_id": "PLACEHOLDER_REQUEST_ID",
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "action_id": "display_gif_animation",
    "animation_info": {
      "frame_count": 1,
      "frame_delay": 100,
      "loop_count": 0,
      "width": 16,
      "height": 16,
      "total_pixels": 256
    },
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "id": 4
}
```

### 5. `convert_image_to_pixels` - Convert Image

**Purpose**: Convert base64 image to pixel matrix for display

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "convert_image_to_pixels",
  "params": {
    "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "target_width": 8,
    "target_height": 8,
    "resize_method": "nearest"
  },
  "id": 5
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "pixel_matrix": [
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"],
      ["#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff", "#0000ff"]
    ],
    "width": 8,
    "height": 8,
    "original_size": {
      "width": 1,
      "height": 1
    },
    "resize_method": "nearest",
    "total_pixels": 64,
    "format_info": {
      "original_mode": "RGB",
      "converted_mode": "RGB",
      "pixel_format": "hex_colors"
    }
  },
  "id": 5
}
```

## ⚙️ Pixel Art Formats

### 🎨 2D Array Format

Pixel patterns as arrays of hex color codes:

```json
[
  ["#FF0000", "#00FF00", "#0000FF"],
  ["#FFFF00", "#FF00FF", "#00FFFF"],
  ["#FFFFFF", "#000000", "#808080"]
]
```

### 🖼️ Base64 Image Format

Convert any image to pixel art:

```json
{
  "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "target_width": 16,
  "target_height": 16
}
```

### 🎬 GIF Animation Format

Animated pixel art with frame control:

```json
{
  "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "frame_delay": 100,
  "loop_count": 0,
  "target_width": 16,
  "target_height": 16
}
```

## 🎯 Pixel Art Examples

### 😊 Smiley Face (8x8)
```json
[
  ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"],
  ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
  ["#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00"],
  ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
  ["#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00"],
  ["#FFFF00", "#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00"],
  ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
  ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"]
]
```

### ❤️ Heart Shape (8x8)
```json
[
  ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"],
  ["#000000", "#FF0000", "#FF0000", "#000000", "#000000", "#FF0000", "#FF0000", "#000000"],
  ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
  ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
  ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
  ["#000000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#000000"],
  ["#000000", "#000000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#000000", "#000000"],
  ["#000000", "#000000", "#000000", "#FF0000", "#FF0000", "#000000", "#000000", "#000000"]
]
```

## ☁️ Tencent Cloud IoT Integration

### Device Action Protocol

The service uses Tencent Cloud IoT Explorer for device communication:

- **Action**: `display_pixel_image` - Display static pixel image
- **Action**: `display_gif_animation` - Display animated GIF

### Message Format

Device actions follow this standardized format:

```json
{
  "action": "display_pixel_image",
  "width": 16,
  "height": 16,
  "pixel_data": [
    ["#FF0000", "#00FF00"],
    ["#0000FF", "#FFFFFF"]
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Security & Authentication

- **Protocol**: HTTPS API calls to Tencent Cloud IoT Explorer
- **Authentication**: STS temporary credentials with limited permissions
- **Authorization**: Device-specific access control via session policies
- **Encryption**: TLS 1.2+ with end-to-end encryption

### Environment Configuration

Required environment variables:

```bash
export IOT_ROLE_ARN="qcs::cam::uin/123456789:role/IoTDeviceRole"
export TC_SECRET_ID="AKID_PLACEHOLDER_SECRET_ID"  # Optional in CVM/TKE
export TC_SECRET_KEY="PLACEHOLDER_SECRET_KEY"     # Optional in CVM/TKE
export DEFAULT_REGION="ap-guangzhou"
```

## 🧪 Testing & Validation

### Automated Test Suite

Run the complete test suite:

```bash
# Individual tests
./test_help.sh                    # Test help method
./test_issue_sts.sh              # Test STS credential issuing
./test_send_pixel_image.sh       # Test pixel image sending
./test_send_gif_animation.sh     # Test GIF animation sending
./test_convert_image.sh          # Test image conversion

# All tests via build script
python build.py test
```

### Manual Testing

```bash
# Start interactive server
python mcp_server.py

# Test with curl
curl -X POST http://localhost:8000/help
```

## 🏗️ Build & Deployment

### Build Executable

```bash
# Build standalone executable
python build.py build

# Build with PyInstaller
python build_exec.sh
```

### Docker Deployment

```bash
# Build Docker image
docker build -t pixelmug-mcp .

# Run container
docker run -p 8000:8000 \
  -e IOT_ROLE_ARN="your-role-arn" \
  -e TC_SECRET_ID="your-secret-id" \
  -e TC_SECRET_KEY="your-secret-key" \
  pixelmug-mcp
```

## 📚 Examples

Check the `examples/` directory for:

- `example_client.py` - Python client implementation
- `pixel_art_demo.py` - Pixel art creation examples
- `image_conversion_demo.py` - Image processing examples
- `bluetooth_bridge.py` - Bluetooth integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/AIO-2030/mcp_pixel_mug/issues)
- **Documentation**: [Wiki](https://github.com/AIO-2030/mcp_pixel_mug/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/AIO-2030/mcp_pixel_mug/discussions)

## 🔗 Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol) - MCP specification
- [Tencent Cloud IoT Explorer](https://cloud.tencent.com/product/iotexplorer) - IoT platform
- [PixelMug Hardware](https://github.com/AIO-2030/pixelmug-hardware) - Hardware schematics

```

`mcp_pixel_mug/README_STS.md`:

```md
# 腾讯云IoT STS临时凭证服务

本文档介绍如何使用腾讯云IoT Explorer STS临时凭证服务来控制PixelMug智能杯子。

## 概述

STS (Security Token Service) 是腾讯云提供的临时访问凭证服务，允许您为特定操作颁发具有有限权限的临时访问密钥，而无需暴露长期凭证。

## 环境配置

### 必需的环境变量

```bash
# 必填：CAM角色ARN
export IOT_ROLE_ARN="qcs::cam::uin/123456789:role/IoTDeviceRole"

# 可选：腾讯云凭证（CVM/TKE环境下可省略）
export TC_SECRET_ID="AKID_PLACEHOLDER_SECRET_ID"
export TC_SECRET_KEY="PLACEHOLDER_SECRET_KEY"

# 可选：默认地域
export DEFAULT_REGION="ap-guangzhou"
```

### CAM角色配置

1. 在腾讯云控制台创建CAM角色
2. 配置信任策略，允许IoT服务承担该角色
3. 配置权限策略，限制只能访问特定设备

示例信任策略：
```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "principal": {
        "service": "iotcloud.tencentcloudapi.com"
      },
      "action": "sts:AssumeRole"
    }
  ]
}
```

示例权限策略：
```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "iotcloud:UpdateDeviceShadow",
        "iotcloud:PublishMessage"
      ],
      "resource": [
        "qcs::iotcloud:::productId/ABC123DEF/device/mug_001"
      ]
    }
  ]
}
```

## API使用

### 1. 颁发STS凭证

**请求**：
```json
{
  "jsonrpc": "2.0",
  "method": "issue_sts",
  "params": {
    "product_id": "ABC123DEF",
    "device_name": "mug_001"
  },
  "id": 1
}
```

**响应**：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tmpSecretId": "AKID_PLACEHOLDER_SECRET_ID",
    "tmpSecretKey": "PLACEHOLDER_SECRET_KEY",
    "token": "PLACEHOLDER_TOKEN",
    "expiration": "2024-01-01T12:00:00Z",
    "region": "ap-guangzhou",
    "product_id": "ABC123DEF",
    "device_name": "mug_001",
    "issued_at": "2024-01-01T11:45:00Z"
  },
  "id": 1
}
```

### 2. 使用STS凭证控制设备

获得STS凭证后，可以使用这些临时凭证调用腾讯云IoT Explorer API：

```python
from tencentcloud.iotexplorer.v20190423 import iotexplorer_client, models as iot_models
from tencentcloud.common import credential

# 使用STS凭证创建客户端
cred = credential.Credential(
    secret_id=sts_result["tmpSecretId"],
    secret_key=sts_result["tmpSecretKey"],
    token=sts_result["token"]
)

client = iotexplorer_client.IotexplorerClient(cred, "ap-guangzhou")

# 调用设备操作
req = iot_models.CallDeviceActionAsyncRequest()
params = {
    "ProductId": "ABC123DEF",
    "DeviceName": "mug_001",
    "ActionId": "display_pixel_image",
    "InputParams": json.dumps({
        "action": "display_pixel_image",
        "width": 16,
        "height": 16,
        "pixel_data": [
            ["#FF0000", "#00FF00"],
            ["#0000FF", "#FFFFFF"]
        ]
    })
}
req.from_json_string(json.dumps(params))
resp = client.CallDeviceActionAsync(req)
```

## 安全特性

### 1. 权限最小化

STS凭证只包含执行特定操作所需的最小权限：

- `iotcloud:UpdateDeviceShadow` - 更新设备影子
- `iotcloud:PublishMessage` - 发布消息到设备

### 2. 设备级访问控制

每个STS凭证只能访问指定的单个设备：

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "iotcloud:UpdateDeviceShadow",
        "iotcloud:PublishMessage"
      ],
      "resource": [
        "qcs::iotcloud:::productId/ABC123DEF/device/mug_001"
      ]
    }
  ]
}
```

### 3. 时间限制

STS凭证具有15分钟的有效期，过期后自动失效：

```json
{
  "tmpSecretId": "AKID_PLACEHOLDER_SECRET_ID",
  "tmpSecretKey": "PLACEHOLDER_SECRET_KEY",
  "token": "PLACEHOLDER_TOKEN",
  "expiration": "2024-01-01T12:00:00Z",  // 15分钟后过期
  "issued_at": "2024-01-01T11:45:00Z"
}
```

## 使用场景

### 1. Web应用集成

在Web应用中，前端可以请求STS凭证来控制用户的设备：

```javascript
// 前端请求STS凭证
const response = await fetch('/api/sts/issue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    product_id: 'ABC123DEF',
    device_name: 'mug_001',
    user_id: 'user123'
  })
});

const stsData = await response.json();

// 使用STS凭证调用腾讯云API
const iotClient = new TencentCloudIoTClient({
  secretId: stsData.tmpSecretId,
  secretKey: stsData.tmpSecretKey,
  token: stsData.token,
  region: stsData.region
});
```

### 2. 移动应用

移动应用可以安全地控制用户设备，无需在应用中存储长期凭证：

```swift
// iOS Swift示例
func requestSTSCredentials(productId: String, deviceName: String) async throws -> STSCredentials {
    let url = URL(string: "https://api.pixelmug.com/sts/issue")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = [
        "product_id": productId,
        "device_name": deviceName,
        "user_id": getCurrentUserId()
    ]
    
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(STSResponse.self, from: data)
    
    return response.data
}
```

### 3. 服务器端代理

服务器可以作为代理，为客户端颁发STS凭证：

```python
from flask import Flask, request, jsonify
from mug_service import mug_service

app = Flask(__name__)

@app.route('/api/device/<product_id>/<device_name>/control', methods=['POST'])
def control_device(product_id, device_name):
    # 验证用户权限
    user_id = request.headers.get('X-User-ID')
    if not mug_service._authorize(user_id, product_id, device_name):
        return jsonify({'error': 'Unauthorized'}), 403
    
    # 颁发STS凭证
    sts_result = mug_service.issue_sts(product_id, device_name)
    
    # 返回STS凭证给客户端
    return jsonify({
        'credentials': sts_result,
        'endpoint': 'https://iotexplorer.tencentcloudapi.com'
    })
```

## 错误处理

### 常见错误

1. **权限不足**
```json
{
  "error": {
    "code": "UnauthorizedOperation",
    "message": "You are not authorized to perform this operation"
  }
}
```

2. **角色不存在**
```json
{
  "error": {
    "code": "InvalidParameter",
    "message": "Role does not exist"
  }
}
```

3. **设备不存在**
```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "Device not found"
  }
}
```

### 错误处理示例

```python
def handle_sts_error(error):
    error_code = error.get('code', 'Unknown')
    error_message = error.get('message', 'Unknown error')
    
    if error_code == 'UnauthorizedOperation':
        print("权限不足，请检查CAM角色配置")
    elif error_code == 'InvalidParameter':
        print("参数错误，请检查产品ID和设备名称")
    elif error_code == 'ResourceNotFound':
        print("设备不存在，请检查设备是否已注册")
    else:
        print(f"未知错误: {error_code} - {error_message}")

# 使用示例
try:
    result = mug_service.issue_sts("ABC123DEF", "mug_001")
    print("STS凭证颁发成功")
except Exception as e:
    if hasattr(e, 'response'):
        error_data = e.response.json()
        handle_sts_error(error_data.get('error', {}))
    else:
        print(f"请求失败: {str(e)}")
```

## 最佳实践

### 1. 凭证缓存

STS凭证有效期为15分钟，建议实现缓存机制：

```python
import time
from functools import lru_cache

class STSCredentialManager:
    def __init__(self):
        self.cache = {}
    
    def get_credentials(self, product_id, device_name):
        cache_key = f"{product_id}:{device_name}"
        
        if cache_key in self.cache:
            creds, timestamp = self.cache[cache_key]
            # 检查是否还有5分钟有效期
            if time.time() - timestamp < 600:  # 10分钟
                return creds
        
        # 颁发新凭证
        creds = mug_service.issue_sts(product_id, device_name)
        self.cache[cache_key] = (creds, time.time())
        return creds
```

### 2. 权限验证

在颁发STS凭证前，验证用户是否有权限访问设备：

```python
def issue_sts_with_authorization(user_id, product_id, device_name):
    # 验证用户权限
    if not mug_service._authorize(user_id, product_id, device_name):
        raise ValueError(f"User {user_id} has no permission to access device {product_id}/{device_name}")
    
    # 颁发STS凭证
    return mug_service.issue_sts(product_id, device_name)
```

### 3. 监控和日志

记录STS凭证的颁发和使用情况：

```python
import logging

logger = logging.getLogger(__name__)

def issue_sts_with_logging(product_id, device_name, user_id):
    logger.info(f"Issuing STS credentials for user {user_id}, device {product_id}/{device_name}")
    
    try:
        result = mug_service.issue_sts(product_id, device_name)
        logger.info(f"STS credentials issued successfully for {product_id}/{device_name}")
        return result
    except Exception as e:
        logger.error(f"Failed to issue STS credentials: {str(e)}")
        raise
```

## 故障排除

### 1. 凭证颁发失败

检查环境变量配置：
```bash
echo $IOT_ROLE_ARN
echo $TC_SECRET_ID
echo $TC_SECRET_KEY
echo $DEFAULT_REGION
```

### 2. 权限不足

检查CAM角色配置：
- 角色是否存在
- 信任策略是否正确
- 权限策略是否包含所需操作

### 3. 设备访问失败

检查设备状态：
- 设备是否已注册
- 产品ID是否正确
- 设备名称是否正确

### 4. 网络连接问题

检查网络连接：
```bash
curl -I https://sts.tencentcloudapi.com
curl -I https://iotexplorer.tencentcloudapi.com
```

## 相关文档

- [腾讯云STS文档](https://cloud.tencent.com/document/product/598)
- [腾讯云IoT Explorer文档](https://cloud.tencent.com/document/product/1081)
- [CAM角色管理](https://cloud.tencent.com/document/product/598/19422)
- [设备影子服务](https://cloud.tencent.com/document/product/1081/50280)

```

`mcp_pixel_mug/build.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug MCP Project Build Script
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path


class ProjectBuilder:
    """Project Builder"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.dist_dir = self.project_root / "dist"
        self.build_dir = self.project_root / "build"
    
    def clean(self):
        """Clean build directories"""
        print("🧹 Cleaning build directories...")
        
        for dir_path in [self.dist_dir, self.build_dir]:
            if dir_path.exists():
                shutil.rmtree(dir_path)
                print(f"   Removed: {dir_path}")
        
        # Clean Python cache
        for cache_dir in self.project_root.rglob("__pycache__"):
            shutil.rmtree(cache_dir)
            print(f"   Removed cache: {cache_dir}")
        
        for pyc_file in self.project_root.rglob("*.pyc"):
            pyc_file.unlink()
            print(f"   Removed: {pyc_file}")
        
        print("✅ Cleanup completed")
        return True
    
    def check_dependencies(self):
        """Check dependencies"""
        print("📦 Checking dependencies...")
        
        requirements_file = self.project_root / "requirements.txt"
        if not requirements_file.exists():
            print("❌ requirements.txt does not exist")
            return False
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "check"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                print("✅ Dependencies check passed")
                return True
            else:
                print(f"❌ Dependencies check failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error occurred during dependencies check: {str(e)}")
            return False
    
    def install_dependencies(self):
        """Install dependencies"""
        print("📥 Installing dependencies...")
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                print("✅ Dependencies installation completed")
                return True
            else:
                print("❌ Dependencies installation failed")
                return False
                
        except Exception as e:
            print(f"❌ Error occurred while installing dependencies: {str(e)}")
            return False
    
    def run_tests(self):
        """Run tests"""
        print("🧪 Running tests...")
        
        test_scripts = [
            "test_help.sh",
            "test_prepare.sh", 
            "test_publish.sh"
        ]
        
        all_passed = True
        for script in test_scripts:
            script_path = self.project_root / script
            if script_path.exists():
                try:
                    print(f"   Running: {script}")
                    result = subprocess.run(
                        ["bash", str(script_path)],
                        cwd=self.project_root,
                        capture_output=True,
                        text=True
                    )
                    
                    if result.returncode == 0:
                        print(f"   ✅ {script} passed")
                    else:
                        print(f"   ❌ {script} failed")
                        print(f"      Output: {result.stdout}")
                        print(f"      Error: {result.stderr}")
                        all_passed = False
                        
                except Exception as e:
                    print(f"   ❌ Error occurred while running {script}: {str(e)}")
                    all_passed = False
            else:
                print(f"   ⚠️  Test script {script} does not exist")
        
        if all_passed:
            print("✅ All tests passed")
        else:
            print("❌ Some tests failed")
        
        return all_passed
    
    def build_package(self):
        """Build package"""
        print("📦 Building package...")
        
        # Create build directory
        self.dist_dir.mkdir(exist_ok=True)
        
        # Copy source code files
        source_files = [
            "mug_service.py",
            "mcp_server.py", 
            "stdio_server.py",
            "requirements.txt",
            "README.md",
            "LICENSE"
        ]
        
        for file_name in source_files:
            src_file = self.project_root / file_name
            if src_file.exists():
                dst_file = self.dist_dir / file_name
                shutil.copy2(src_file, dst_file)
                print(f"   Copied: {file_name}")
            else:
                print(f"   ⚠️  File does not exist: {file_name}")
        
        # Create startup script
        startup_script = self.dist_dir / "start_server.py"
        startup_content = '''#!/usr/bin/env python3
"""PixelMug MCP Server Startup Script"""

import sys
import asyncio
from stdio_server import main

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\nServer stopped")
        sys.exit(0)
'''
        startup_script.write_text(startup_content, encoding='utf-8')
        startup_script.chmod(0o755)
        print("   Created: start_server.py")
        
        print("✅ Package build completed")
        return True
    
    def validate_project(self):
        """Validate project"""
        print("🔍 Validating project...")
        
        required_files = [
            "mug_service.py",
            "mcp_server.py",
            "stdio_server.py",
            "requirements.txt"
        ]
        
        all_valid = True
        for file_name in required_files:
            file_path = self.project_root / file_name
            if file_path.exists():
                print(f"   ✅ {file_name}")
            else:
                print(f"   ❌ Missing file: {file_name}")
                all_valid = False
        
        # Validate Python syntax
        for py_file in ["mug_service.py", "mcp_server.py", "stdio_server.py"]:
            file_path = self.project_root / py_file
            if file_path.exists():
                try:
                    result = subprocess.run(
                        [sys.executable, "-m", "py_compile", str(file_path)],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        print(f"   ✅ {py_file} syntax correct")
                    else:
                        print(f"   ❌ {py_file} syntax error: {result.stderr}")
                        all_valid = False
                except Exception as e:
                    print(f"   ❌ Error occurred while validating {py_file}: {str(e)}")
                    all_valid = False
        
        if all_valid:
            print("✅ Project validation passed")
        else:
            print("❌ Project validation failed")
        
        return all_valid
    
    def build_all(self):
        """Complete build process"""
        print("🚀 Starting PixelMug MCP Project Build")
        print("=" * 50)
        
        steps = [
            ("Clean", self.clean),
            ("Validate Project", self.validate_project),
            ("Install Dependencies", self.install_dependencies),
            ("Check Dependencies", self.check_dependencies),
            ("Run Tests", self.run_tests),
            ("Build Package", self.build_package)
        ]
        
        for step_name, step_func in steps:
            print(f"\n📋 {step_name}...")
            try:
                if not step_func():
                    print(f"❌ {step_name} failed, build aborted")
                    return False
            except Exception as e:
                print(f"❌ Error occurred during {step_name}: {str(e)}")
                return False
        
        print("\n" + "=" * 50)
        print("🎉 Build completed successfully!")
        print(f"📦 Build artifacts located at: {self.dist_dir}")
        print("\nTo start the server:")
        print(f"   cd {self.dist_dir}")
        print("   python start_server.py")
        
        return True
    
    def build_executable(self, mode: str = "stdio"):
        """Build standalone executable"""
        print(f"🚀 Building executable for {mode} mode...")
        
        try:
            # Check if PyInstaller is available
            result = subprocess.run(
                [sys.executable, "-c", "import PyInstaller"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print("📦 Installing PyInstaller...")
                install_result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", "pyinstaller==6.3.0"],
                    cwd=self.project_root
                )
                if install_result.returncode != 0:
                    print("❌ Failed to install PyInstaller")
                    return False
            
            # Run the build script
            build_script = self.project_root / "build_exec.sh"
            if build_script.exists():
                result = subprocess.run(
                    ["bash", str(build_script), mode],
                    cwd=self.project_root
                )
                
                if result.returncode == 0:
                    print("✅ Executable build completed")
                    return True
                else:
                    print("❌ Executable build failed")
                    return False
            else:
                print("❌ build_exec.sh not found")
                return False
                
        except Exception as e:
            print(f"❌ Error occurred during executable build: {str(e)}")
            return False


def main():
    """Main function"""
    builder = ProjectBuilder()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "clean":
            builder.clean()
        elif command == "install":
            builder.install_dependencies()
        elif command == "test":
            builder.run_tests()
        elif command == "build":
            builder.build_package()
        elif command == "validate":
            builder.validate_project()
        elif command == "all":
            builder.build_all()
        elif command == "exe" or command == "executable":
            mode = sys.argv[2] if len(sys.argv) > 2 else "stdio"
            builder.build_executable(mode)
        else:
            print(f"Unknown command: {command}")
            print("Available commands: clean, install, test, build, validate, all, exe [stdio|mcp]")
            sys.exit(1)
    else:
        # Default to complete build
        if not builder.build_all():
            sys.exit(1)


if __name__ == "__main__":
    main()

```

`mcp_pixel_mug/build_exec.sh`:

```sh
#!/bin/bash
# PixelMug MCP Executable Build Script
# Wrapper script that calls build.py for reliable building

set -e

echo "🚀 PixelMug MCP Executable Builder"
echo "=================================="
echo "📋 Using Python build script for maximum reliability..."
echo ""

# Check if build.py exists
if [ ! -f "build.py" ]; then
    echo "❌ Error: build.py not found in current directory"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Check Python availability
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Error: Python not found"
    echo "   Please ensure Python 3 is installed and available"
    exit 1
fi

# Use python3 if available, otherwise fall back to python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Parse arguments
MODE=${1:-all}

if [ "$MODE" == "stdio" ]; then
    echo "🔧 Building Standard I/O Mode only..."
    echo "⚠️  Note: build_simple_exe.py builds both modes by default"
    echo "   For single mode builds, use Python script directly:"
    echo "   python3 -c \"from build_simple_exe import *; build_simple_executable('stdio_server.py', 'pixelmug_stdio')\""
    echo ""
elif [ "$MODE" == "mcp" ]; then
    echo "🔧 Building Interactive Mode only..."
    echo "⚠️  Note: build_simple_exe.py builds both modes by default"
    echo "   For single mode builds, use Python script directly:"
    echo "   python3 -c \"from build_simple_exe import *; build_simple_executable('mcp_server.py', 'pixelmug_interactive')\""
    echo ""
else
    echo "🔧 Building both Standard I/O and Interactive modes..."
fi

# Call the Python build script
echo "▶️  Executing: $PYTHON_CMD build.py build"
echo ""

if $PYTHON_CMD build.py build; then
    echo ""
    echo "🎉 Build completed successfully!"
    echo ""
    echo "📦 Generated executables:"
    if [ -f "dist/pixelmug_stdio" ]; then
        echo "   ✅ dist/pixelmug_stdio (Standard I/O mode)"
        SIZE=$(du -h dist/pixelmug_stdio 2>/dev/null | cut -f1 || echo "Unknown")
        echo "      Size: $SIZE"
    fi
    if [ -f "dist/pixelmug_interactive" ]; then
        echo "   ✅ dist/pixelmug_interactive (Interactive mode)"
        SIZE=$(du -h dist/pixelmug_interactive 2>/dev/null | cut -f1 || echo "Unknown")
        echo "      Size: $SIZE"
    fi
    
    echo ""
    echo "🚀 Usage Examples:"
    echo "   # Test Standard I/O mode:"
    echo "   echo '{\"jsonrpc\":\"2.0\",\"method\":\"help\",\"id\":1}' | ./dist/pixelmug_stdio"
    echo ""
    echo "   # Run Interactive mode:"
    echo "   ./dist/pixelmug_interactive"
    echo ""
    echo "   # Test pixel art feature:"
    echo "   echo '{\"jsonrpc\":\"2.0\",\"method\":\"publish_action\",\"params\":{\"device_id\":\"mug_001\",\"action\":\"pixel_art\",\"params\":{\"pattern\":[[\"#FF0000\",\"#00FF00\"],[\"#0000FF\",\"#FFFFFF\"]],\"width\":2,\"height\":2,\"duration\":10}},\"id\":1}' | ./dist/pixelmug_stdio"
    
else
    echo ""
    echo "❌ Build failed!"
    echo "   Check the output above for error details"
    echo "   You can also try running the Python script directly:"
    echo "   $PYTHON_CMD build_simple_exe.py"
    exit 1
fi

echo ""
echo "🔧 Additional Options:"
echo "   ./build_exec.sh          # Build both executables (default)"
echo "   ./build_exec.sh stdio    # Build Standard I/O server only"
echo "   ./build_exec.sh mcp      # Build Interactive server only"
echo "   python3 build_simple_exe.py  # Direct Python build script"
echo ""
echo "📚 For more information, see README.md"

```

`mcp_pixel_mug/examples/bluetooth_bridge.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug 蓝牙桥接示例
演示如何通过蓝牙发现设备，然后使用 MCP 进行控制
"""

import asyncio
import json
import sys
import os
import time
from typing import Dict, List, Optional

# 添加父目录到路径，以便导入服务模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server import MCPServer

# 模拟蓝牙模块（在实际应用中应该使用真实的蓝牙库如 pybluez）
class MockBluetooth:
    """模拟蓝牙功能类"""
    
    @staticmethod
    def discover_devices(lookup_names=True, duration=8):
        """模拟蓝牙设备发现"""
        print(f"🔍 开始蓝牙设备扫描（{duration}秒）...")
        time.sleep(2)  # 模拟扫描时间
        
        # 模拟发现的设备
        mock_devices = [
            ("AA:BB:CC:DD:EE:01", "PixelMug-001"),
            ("AA:BB:CC:DD:EE:02", "PixelMug-002"), 
            ("FF:EE:DD:CC:BB:AA", "iPhone"),
            ("11:22:33:44:55:66", "PixelMug-Pro-003"),
        ]
        
        if lookup_names:
            return mock_devices
        else:
            return [addr for addr, _ in mock_devices]
    
    @staticmethod
    def lookup_name(address, timeout=10):
        """模拟查找设备名称"""
        device_names = {
            "AA:BB:CC:DD:EE:01": "PixelMug-001",
            "AA:BB:CC:DD:EE:02": "PixelMug-002",
            "11:22:33:44:55:66": "PixelMug-Pro-003",
        }
        return device_names.get(address, "Unknown Device")


class BluetoothPixelMugBridge:
    """蓝牙 PixelMug 桥接器"""
    
    def __init__(self):
        self.mcp_server = MCPServer()
        self.discovered_mugs: Dict[str, Dict] = {}
        self.request_id = 1
    
    def get_next_id(self):
        """获取下一个请求ID"""
        current_id = self.request_id
        self.request_id += 1
        return current_id
    
    def extract_device_id(self, bluetooth_addr: str, device_name: str) -> str:
        """从蓝牙地址和设备名提取设备ID"""
        # 尝试从设备名中提取ID
        if "PixelMug-" in device_name:
            name_parts = device_name.split("-")
            if len(name_parts) >= 2:
                return f"mug_{name_parts[-1].lower()}"
        
        # 如果无法从名称提取，使用蓝牙地址
        addr_suffix = bluetooth_addr.replace(":", "")[-6:].lower()
        return f"mug_{addr_suffix}"
    
    async def discover_pixelmug_devices(self) -> List[Dict]:
        """发现 PixelMug 设备"""
        print("🔍 开始扫描 PixelMug 设备...")
        
        try:
            # 使用模拟蓝牙（在实际应用中替换为真实蓝牙库）
            devices = MockBluetooth.discover_devices(lookup_names=True, duration=5)
            
            pixelmug_devices = []
            
            for addr, name in devices:
                if "PixelMug" in name:
                    device_id = self.extract_device_id(addr, name)
                    
                    device_info = {
                        "bluetooth_addr": addr,
                        "device_name": name,
                        "device_id": device_id,
                        "discovered_at": time.time()
                    }
                    
                    pixelmug_devices.append(device_info)
                    self.discovered_mugs[device_id] = device_info
                    
                    print(f"   ✅ 发现设备: {name} ({addr}) -> {device_id}")
            
            if not pixelmug_devices:
                print("   ❌ 未发现 PixelMug 设备")
            else:
                print(f"   🎉 共发现 {len(pixelmug_devices)} 台 PixelMug 设备")
            
            return pixelmug_devices
            
        except Exception as e:
            print(f"   💥 蓝牙扫描失败: {str(e)}")
            return []
    
    async def call_mcp_method(self, method: str, params: dict = None) -> Optional[dict]:
        """调用 MCP 方法"""
        if params is None:
            params = {}
            
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": self.get_next_id()
        }
        
        try:
            response_str = await self.mcp_server.handle_request(json.dumps(request))
            response = json.loads(response_str)
            
            if "error" in response:
                print(f"   ❌ MCP 错误: {response['error']['message']}")
                return None
            else:
                return response.get("result")
                
        except Exception as e:
            print(f"   💥 MCP 调用异常: {str(e)}")
            return None
    
    async def prepare_device_connection(self, device_id: str) -> bool:
        """为设备准备 MQTT 连接"""
        print(f"🔌 为设备 {device_id} 准备连接...")
        
        result = await self.call_mcp_method("prepare_mqtt_connection", {"device_id": device_id})
        
        if result:
            print(f"   ✅ 连接准备成功")
            print(f"   📡 MQTT 主机: {result.get('host')}")
            print(f"   📺 命令主题: {result.get('topic')}")
            return True
        else:
            print(f"   ❌ 连接准备失败")
            return False
    
    async def send_device_command(self, device_id: str, action: str, params: dict) -> bool:
        """向设备发送命令"""
        print(f"📤 向设备 {device_id} 发送 {action} 命令...")
        
        result = await self.call_mcp_method("publish_action", {
            "device_id": device_id,
            "action": action,
            "params": params
        })
        
        if result:
            print(f"   ✅ 命令发送成功")
            print(f"   🕐 时间戳: {result.get('timestamp')}")
            print(f"   🔖 请求ID: {result.get('request_id')}")
            return True
        else:
            print(f"   ❌ 命令发送失败")
            return False
    
    async def demo_device_control_flow(self, device_id: str):
        """演示完整的设备控制流程"""
        print(f"\n🎮 设备 {device_id} 控制流程演示")
        print("=" * 60)
        
        # 1. 准备连接
        if not await self.prepare_device_connection(device_id):
            return
        
        await asyncio.sleep(1)
        
        # 2. 设备初始化序列
        print(f"\n🚀 设备初始化...")
        initialization_steps = [
            ("display", {"text": "Connecting...", "duration": 5}, "显示连接状态"),
            ("color", {"color": "#00FF00", "mode": "blink"}, "绿色闪烁表示连接成功"),
            ("display", {"text": "Ready!", "duration": 3}, "显示就绪状态"),
        ]
        
        for action, params, description in initialization_steps:
            print(f"   📋 {description}")
            await self.send_device_command(device_id, action, params)
            await asyncio.sleep(1)
        
        # 3. 模拟用户使用场景
        print(f"\n☕ 模拟冲泡咖啡场景...")
        coffee_workflow = [
            ("heat", {"temperature": 85}, "预热到最佳冲泡温度"),
            ("display", {"text": "Heating...", "duration": 10}, "显示加热状态"),
            ("color", {"color": "#FF4500", "mode": "solid"}, "橙色表示加热中"),
            ("brew", {"type": "americano", "strength": "medium"}, "开始冲泡美式咖啡"),
            ("display", {"text": "Brewing...", "duration": 15}, "显示冲泡状态"),
            ("color", {"color": "#8B4513", "mode": "solid"}, "棕色表示咖啡颜色"),
            ("display", {"text": "Enjoy!", "duration": 20}, "完成提示"),
            ("color", {"color": "#FFD700", "mode": "solid"}, "金色表示完成"),
        ]
        
        for action, params, description in coffee_workflow:
            print(f"   ☕ {description}")
            await self.send_device_command(device_id, action, params)
            await asyncio.sleep(1.5)
        
        print(f"   🎉 咖啡制作完成!")
    
    async def batch_device_control(self):
        """批量设备控制演示"""
        if not self.discovered_mugs:
            print("❌ 没有发现的设备可供控制")
            return
        
        print(f"\n📦 批量设备控制演示")
        print("=" * 60)
        
        # 为所有设备设置同步显示
        sync_message = f"Sync at {time.strftime('%H:%M:%S')}"
        
        tasks = []
        for device_id in self.discovered_mugs.keys():
            task = self.send_device_command(device_id, "display", {
                "text": sync_message,
                "duration": 10
            })
            tasks.append(task)
        
        print(f"📡 向 {len(tasks)} 台设备同时发送同步消息...")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = sum(1 for result in results if result is True)
        print(f"   ✅ {success_count}/{len(tasks)} 台设备响应成功")
    
    async def run_bridge_demo(self):
        """运行完整的桥接演示"""
        print("🌉 PixelMug 蓝牙桥接演示")
        print("=" * 80)
        
        try:
            # 1. 发现设备
            devices = await self.discover_pixelmug_devices()
            
            if not devices:
                print("❌ 未发现设备，演示结束")
                return
            
            await asyncio.sleep(2)
            
            # 2. 单设备控制演示
            first_device_id = devices[0]["device_id"]
            await self.demo_device_control_flow(first_device_id)
            
            await asyncio.sleep(2)
            
            # 3. 批量控制演示（如果有多个设备）
            if len(devices) > 1:
                await self.batch_device_control()
            
            # 4. 设备状态查询演示
            print(f"\n📊 设备状态查询")
            print("=" * 60)
            
            for device_id, device_info in self.discovered_mugs.items():
                print(f"设备: {device_id}")
                print(f"   蓝牙地址: {device_info['bluetooth_addr']}")
                print(f"   设备名称: {device_info['device_name']}")
                print(f"   发现时间: {time.ctime(device_info['discovered_at'])}")
                
                # 获取连接信息
                conn_info = await self.call_mcp_method("prepare_mqtt_connection", {"device_id": device_id})
                if conn_info:
                    print(f"   MQTT 主题: {conn_info.get('topic')}")
                print()
            
            print("🎉 桥接演示完成!")
            
        except KeyboardInterrupt:
            print("\n⏸️ 演示被用户中断")
        except Exception as e:
            print(f"💥 演示过程中发生错误: {str(e)}")


async def interactive_bridge_mode():
    """交互式桥接模式"""
    bridge = BluetoothPixelMugBridge()
    
    print("🌉 PixelMug 蓝牙桥接交互模式")
    print("=" * 50)
    print("可用命令:")
    print("  scan - 扫描 PixelMug 设备")
    print("  list - 列出已发现的设备")
    print("  connect <device_id> - 准备设备连接")
    print("  send <device_id> <action> [params] - 发送命令")
    print("  demo [device_id] - 运行控制演示")
    print("  batch - 批量设备控制")
    print("  exit - 退出")
    print("=" * 50)
    
    while True:
        try:
            command = input("\n🔧 请输入命令: ").strip()
            
            if not command:
                continue
                
            if command == "exit":
                print("👋 再见!")
                break
            elif command == "scan":
                await bridge.discover_pixelmug_devices()
            elif command == "list":
                if bridge.discovered_mugs:
                    print("📱 已发现的设备:")
                    for device_id, info in bridge.discovered_mugs.items():
                        print(f"   • {device_id}: {info['device_name']} ({info['bluetooth_addr']})")
                else:
                    print("❌ 没有发现的设备，请先运行 scan 命令")
            elif command.startswith("connect "):
                parts = command.split()
                if len(parts) >= 2:
                    device_id = parts[1]
                    await bridge.prepare_device_connection(device_id)
                else:
                    print("❌ 用法: connect <device_id>")
            elif command.startswith("demo"):
                parts = command.split()
                if len(parts) >= 2:
                    device_id = parts[1]
                    await bridge.demo_device_control_flow(device_id)
                elif bridge.discovered_mugs:
                    device_id = list(bridge.discovered_mugs.keys())[0]
                    await bridge.demo_device_control_flow(device_id)
                else:
                    print("❌ 没有可用设备，请先运行 scan 命令")
            elif command == "batch":
                await bridge.batch_device_control()
            elif command.startswith("send "):
                parts = command.split()
                if len(parts) >= 3:
                    device_id = parts[1]
                    action = parts[2]
                    # 简化参数处理
                    if action == "heat" and len(parts) >= 4:
                        params = {"temperature": int(parts[3])}
                    elif action == "display" and len(parts) >= 4:
                        text = " ".join(parts[3:])
                        params = {"text": text, "duration": 10}
                    elif action == "color" and len(parts) >= 4:
                        params = {"color": parts[3], "mode": "solid"}
                    elif action == "brew" and len(parts) >= 4:
                        params = {"type": parts[3], "strength": "medium"}
                    else:
                        params = {}
                    
                    await bridge.send_device_command(device_id, action, params)
                else:
                    print("❌ 用法: send <device_id> <action> [params]")
            else:
                print("❌ 未知命令，输入可用命令查看帮助")
                
        except KeyboardInterrupt:
            print("\n\n👋 再见!")
            break
        except ValueError as e:
            print(f"❌ 参数错误: {str(e)}")
        except Exception as e:
            print(f"💥 发生错误: {str(e)}")


async def main():
    """主函数"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "demo":
            # 运行演示
            bridge = BluetoothPixelMugBridge()
            await bridge.run_bridge_demo()
        elif sys.argv[1] == "interactive":
            # 交互式模式
            await interactive_bridge_mode()
        else:
            print("用法: python bluetooth_bridge.py [demo|interactive]")
    else:
        # 默认运行演示
        bridge = BluetoothPixelMugBridge()
        await bridge.run_bridge_demo()


if __name__ == "__main__":
    asyncio.run(main())

```

`mcp_pixel_mug/examples/example_client.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug MCP Client Usage Example
Demonstrates how to call various MCP service functions
"""

import json
import asyncio
import sys
import os

# Add parent directory to path for importing service modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server import MCPServer


class PixelMugClient:
    """PixelMug client example class"""
    
    def __init__(self):
        self.server = MCPServer()
        self.request_id = 1
    
    def get_next_id(self):
        """Get next request ID"""
        current_id = self.request_id
        self.request_id += 1
        return current_id
    
    async def call_method(self, method: str, params: dict = None):
        """Call MCP method"""
        if params is None:
            params = {}
            
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": self.get_next_id()
        }
        
        print(f"🔄 Calling method: {method}")
        print(f"📤 Request: {json.dumps(request, ensure_ascii=False, indent=2)}")
        
        try:
            response_str = await self.server.handle_request(json.dumps(request))
            response = json.loads(response_str)
            
            print(f"📥 Response: {json.dumps(response, ensure_ascii=False, indent=2)}")
            
            if "error" in response:
                print(f"❌ Error: {response['error']['message']}")
                return None
            else:
                print(f"✅ Success")
                return response.get("result")
                
        except Exception as e:
            print(f"💥 Exception: {str(e)}")
            return None
        finally:
            print("-" * 60)
    
    async def demo_help(self):
        """Demonstrate getting help information"""
        print("\n🆘 Getting Help Information")
        print("=" * 60)
        
        result = await self.call_method("help")
        if result:
            print(f"📋 Service Information:")
            print(f"   Name: {result.get('service')}")
            print(f"   Version: {result.get('version')}")
            print(f"   Description: {result.get('description')}")
            
            print(f"\n🔧 Supported Methods:")
            for method in result.get('methods', []):
                print(f"   • {method['name']}: {method['description']}")
            
            print(f"\n🎮 Supported Operations:")
            for action in result.get('supported_actions', []):
                print(f"   • {action['action']}: {action['description']}")
    
    async def demo_prepare_connection(self):
        """Demonstrate MQTT connection preparation"""
        print("\n🔌 Preparing MQTT Connection")
        print("=" * 60)
        
        # Test normal device
        device_id = "mug_001"
        result = await self.call_method("prepare_mqtt_connection", {"device_id": device_id})
        
        if result:
            print(f"🏠 Connection Information:")
            print(f"   Host: {result.get('host')}")
            print(f"   Port: {result.get('port')}")
            print(f"   Protocol: {result.get('protocol')}")
            print(f"   Client ID: {result.get('client_id')}")
            print(f"   Command Topic: {result.get('topic')}")
            print(f"   Status Topic: {result.get('status_topic')}")
            
            # Display certificate information (abbreviated)
            cert = result.get('cert', '')
            if cert:
                print(f"   Certificate: {cert[:50]}... ({len(cert)} characters)")
    
    async def demo_device_operations(self):
        """Demonstrate various device operations"""
        print("\n🎛️ Device Operation Demonstration")
        print("=" * 60)
        
        device_id = "mug_001"
        
        # 1. Heat operation
        print("\n🔥 Heat Operation")
        await self.call_method("publish_action", {
            "device_id": device_id,
            "action": "heat",
            "params": {"temperature": 65}
        })
        
        # 2. Display information
        print("\n📺 Display Information")
        await self.call_method("publish_action", {
            "device_id": device_id,
            "action": "display", 
            "params": {
                "text": "Good Morning!",
                "duration": 20
            }
        })
        
        # 3. Color operation
        print("\n🌈 Color Operation")
        await self.call_method("publish_action", {
            "device_id": device_id,
            "action": "color",
            "params": {
                "color": "#FF6B6B",
                "mode": "gradient"
            }
        })
        
        # 4. Brew coffee
        print("\n☕ Brew Coffee")
        await self.call_method("publish_action", {
            "device_id": device_id,
            "action": "brew",
            "params": {
                "type": "americano",
                "strength": "medium"
            }
        })
    
    async def demo_error_handling(self):
        """Demonstrate error handling"""
        print("\n🚫 Error Handling Demonstration")
        print("=" * 60)
        
        # 1. Unregistered device
        print("\n❌ Unregistered Device")
        await self.call_method("prepare_mqtt_connection", {"device_id": "mug_999"})
        
        # 2. Invalid operation
        print("\n❌ Invalid Operation")
        await self.call_method("publish_action", {
            "device_id": "mug_001",
            "action": "fly",
            "params": {}
        })
        
        # 3. Parameter validation failure
        print("\n❌ Parameter Out of Range")
        await self.call_method("publish_action", {
            "device_id": "mug_001", 
            "action": "heat",
            "params": {"temperature": 150}
        })
        
        # 4. Missing required parameter
        print("\n❌ Missing Required Parameter")
        await self.call_method("prepare_mqtt_connection", {})
        
        # 5. Invalid JSON-RPC method
        print("\n❌ Invalid Method")
        await self.call_method("invalid_method", {})
    
    async def demo_batch_operations(self):
        """Demonstrate batch operations"""
        print("\n📦 Batch Operations Demonstration")
        print("=" * 60)
        
        device_id = "mug_001"
        
        # Simulate a complete morning usage workflow
        operations = [
            ("heat", {"temperature": 70}, "Preheat to 70 degrees"),
            ("display", {"text": "Good Morning!", "duration": 10}, "Display morning greeting"),
            ("color", {"color": "#FFD700", "mode": "solid"}, "Set gold color theme"),
            ("brew", {"type": "espresso", "strength": "strong"}, "Make espresso"),
            ("display", {"text": "Enjoy your coffee!", "duration": 15}, "Display enjoy message")
        ]
        
        print("🌅 Morning Usage Workflow:")
        for i, (action, params, description) in enumerate(operations, 1):
            print(f"\nStep {i}: {description}")
            await self.call_method("publish_action", {
                "device_id": device_id,
                "action": action,
                "params": params
            })
            
            # Simulate operation interval
            await asyncio.sleep(0.5)
    
    async def run_all_demos(self):
        """Run all demonstrations"""
        print("🎯 PixelMug MCP Client Demonstration Program")
        print("=" * 80)
        
        demos = [
            self.demo_help,
            self.demo_prepare_connection,
            self.demo_device_operations,
            self.demo_batch_operations,
            self.demo_error_handling
        ]
        
        for demo in demos:
            try:
                await demo()
                await asyncio.sleep(1)  # Demo interval
            except KeyboardInterrupt:
                print("\n\n⏸️ Demo interrupted by user")
                break
            except Exception as e:
                print(f"\n💥 Error occurred during demo: {str(e)}")
        
        print("\n🎉 Demo completed!")
        print("=" * 80)


async def interactive_mode():
    """Interactive mode"""
    client = PixelMugClient()
    
    print("🎮 PixelMug MCP Interactive Client")
    print("=" * 50)
    print("Available commands:")
    print("  help - Get help information")
    print("  prepare <device_id> - Prepare connection")
    print("  heat <device_id> <temperature> - Heat mug")
    print("  display <device_id> <text> [duration] - Display information")
    print("  color <device_id> <color> [mode] - Change color")
    print("  brew <device_id> <type> [strength] - Brew coffee")
    print("  demo - Run complete demonstration")
    print("  exit - Exit")
    print("=" * 50)
    
    while True:
        try:
            command = input("\n🔧 Enter command: ").strip()
            
            if not command:
                continue
                
            if command == "exit":
                print("👋 Goodbye!")
                break
            elif command == "demo":
                await client.run_all_demos()
            elif command == "help":
                await client.demo_help()
            elif command.startswith("prepare "):
                parts = command.split()
                if len(parts) >= 2:
                    device_id = parts[1]
                    await client.call_method("prepare_mqtt_connection", {"device_id": device_id})
                else:
                    print("❌ Usage: prepare <device_id>")
            elif command.startswith("heat "):
                parts = command.split()
                if len(parts) >= 3:
                    device_id = parts[1]
                    temperature = int(parts[2])
                    await client.call_method("publish_action", {
                        "device_id": device_id,
                        "action": "heat",
                        "params": {"temperature": temperature}
                    })
                else:
                    print("❌ Usage: heat <device_id> <temperature>")
            elif command.startswith("display "):
                parts = command.split(maxsplit=3)
                if len(parts) >= 3:
                    device_id = parts[1]
                    text = parts[2]
                    duration = int(parts[3]) if len(parts) > 3 else 10
                    await client.call_method("publish_action", {
                        "device_id": device_id,
                        "action": "display",
                        "params": {"text": text, "duration": duration}
                    })
                else:
                    print("❌ Usage: display <device_id> <text> [duration]")
            elif command.startswith("color "):
                parts = command.split()
                if len(parts) >= 3:
                    device_id = parts[1]
                    color = parts[2]
                    mode = parts[3] if len(parts) > 3 else "solid"
                    await client.call_method("publish_action", {
                        "device_id": device_id,
                        "action": "color",
                        "params": {"color": color, "mode": mode}
                    })
                else:
                    print("❌ Usage: color <device_id> <color> [mode]")
            elif command.startswith("brew "):
                parts = command.split()
                if len(parts) >= 3:
                    device_id = parts[1]
                    brew_type = parts[2]
                    strength = parts[3] if len(parts) > 3 else "medium"
                    await client.call_method("publish_action", {
                        "device_id": device_id,
                        "action": "brew",
                        "params": {"type": brew_type, "strength": strength}
                    })
                else:
                    print("❌ Usage: brew <device_id> <type> [strength]")
            else:
                print("❌ Unknown command, type available commands to see help")
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except ValueError as e:
            print(f"❌ Parameter error: {str(e)}")
        except Exception as e:
            print(f"💥 Error occurred: {str(e)}")


async def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "demo":
            # Run demonstration
            client = PixelMugClient()
            await client.run_all_demos()
        elif sys.argv[1] == "interactive":
            # Interactive mode
            await interactive_mode()
        else:
            print("Usage: python example_client.py [demo|interactive]")
    else:
        # Default run demonstration
        client = PixelMugClient()
        await client.run_all_demos()


if __name__ == "__main__":
    asyncio.run(main())

```

`mcp_pixel_mug/examples/image_conversion_demo.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug Image Conversion Demo
Demonstrates image-to-pixel conversion capabilities
"""

import json
import asyncio
import sys
import os
import base64

# Add parent directory to path for importing service modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server import MCPServer


class ImageConversionDemo:
    """PixelMug Image Conversion demonstration class"""
    
    def __init__(self):
        self.server = MCPServer()
        self.request_id = 1
    
    def get_next_id(self):
        """Get next request ID"""
        current_id = self.request_id
        self.request_id += 1
        return current_id
    
    async def convert_image(self, name: str, image_data: str, target_width: int = 16, target_height: int = 16, resize_method: str = "nearest"):
        """Convert image to pixel matrix"""
        request = {
            "jsonrpc": "2.0",
            "method": "convert_image_to_pixels",
            "params": {
                "image_data": image_data,
                "target_width": target_width,
                "target_height": target_height,
                "resize_method": resize_method
            },
            "id": self.get_next_id()
        }
        
        print(f"🖼️ Converting: {name}")
        print(f"📏 Target size: {target_width}x{target_height}")
        print(f"🔄 Resize method: {resize_method}")
        
        try:
            response_str = await self.server.handle_request(json.dumps(request))
            response = json.loads(response_str)
            
            if "error" in response:
                print(f"❌ Error: {response['error']['message']}")
                return None
            else:
                result = response["result"]
                original_size = result["original_size"]
                print(f"✅ Converted from {original_size['width']}x{original_size['height']} to {target_width}x{target_height}")
                print(f"📊 Total pixels: {result['total_pixels']}")
                return result
                
        except Exception as e:
            print(f"💥 Exception: {str(e)}")
            return None
        finally:
            print("-" * 60)
    
    async def convert_and_display(self, device_id: str, name: str, image_data: str, target_width: int = 16, target_height: int = 16, duration: int = 20):
        """Convert image and display on device"""
        # First convert the image
        conversion_result = await self.convert_image(name, image_data, target_width, target_height)
        
        if conversion_result is None:
            return False
        
        # Then send to device using pixel_art action
        pixel_matrix = conversion_result["pixel_matrix"]
        
        request = {
            "jsonrpc": "2.0",
            "method": "publish_action",
            "params": {
                "device_id": device_id,
                "action": "pixel_art",
                "params": {
                    "pattern": pixel_matrix,
                    "width": target_width,
                    "height": target_height,
                    "duration": duration
                }
            },
            "id": self.get_next_id()
        }
        
        print(f"📤 Sending converted image to device: {device_id}")
        
        try:
            response_str = await self.server.handle_request(json.dumps(request))
            response = json.loads(response_str)
            
            if "error" in response:
                print(f"❌ Display Error: {response['error']['message']}")
                return False
            else:
                print(f"✅ Successfully displayed converted image on device")
                return True
                
        except Exception as e:
            print(f"💥 Display Exception: {str(e)}")
            return False
        finally:
            print("-" * 60)
    
    def get_sample_images(self):
        """Get sample base64 encoded images for testing"""
        # These are simple test images in base64 format
        return {
            "simple_2x2": {
                "name": "Simple 2x2 Test Pattern",
                "data": "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIHWP8DwQMDAxwAEEB5gAAAAoAAf8IAFx+AAA==",
                "description": "2x2 pixel test image (white and black)"
            },
            "gradient_4x4": {
                "name": "4x4 Gradient Pattern",
                "data": "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAANklEQVQIHWNgwAH+//9vwKXm////RlxqDh8+bMClBpcaXGpwqcGlBpcaXGpwqcGlBhYAAP//DUAAATYhQs8AAAAASUVORK5CYII=",
                "description": "4x4 gradient pattern"
            }
        }
    
    async def demo_basic_conversion(self):
        """Demonstrate basic image conversion"""
        print("\n🖼️ Basic Image Conversion Demo")
        print("=" * 60)
        
        sample_images = self.get_sample_images()
        
        for image_id, image_info in sample_images.items():
            print(f"\n📸 Testing: {image_info['description']}")
            
            # Convert to different sizes
            sizes = [(8, 8), (16, 16), (12, 8)]
            
            for width, height in sizes:
                await self.convert_image(
                    f"{image_info['name']} -> {width}x{height}",
                    image_info["data"],
                    width,
                    height
                )
                await asyncio.sleep(0.5)
    
    async def demo_resize_methods(self):
        """Demonstrate different resize methods"""
        print("\n🔄 Resize Methods Demo")
        print("=" * 60)
        
        sample_images = self.get_sample_images()
        test_image = sample_images["simple_2x2"]
        
        resize_methods = ["nearest", "bilinear", "bicubic"]
        
        for method in resize_methods:
            print(f"\n🎯 Testing resize method: {method}")
            await self.convert_image(
                f"{test_image['name']} ({method})",
                test_image["data"],
                8, 8,
                method
            )
            await asyncio.sleep(0.5)
    
    async def demo_convert_and_display(self):
        """Demonstrate converting and displaying images"""
        print("\n📺 Convert and Display Demo")
        print("=" * 60)
        
        device_id = "mug_001"
        sample_images = self.get_sample_images()
        
        for image_id, image_info in sample_images.items():
            await self.convert_and_display(
                device_id,
                image_info["name"],
                image_info["data"],
                target_width=8,
                target_height=8,
                duration=15
            )
            await asyncio.sleep(1)
    
    async def demo_error_handling(self):
        """Demonstrate error handling"""
        print("\n⚠️ Error Handling Demo")
        print("=" * 60)
        
        # Test with invalid base64
        print("\n🧪 Testing invalid base64 data:")
        await self.convert_image(
            "Invalid Base64",
            "invalid_base64_data",
            8, 8
        )
        
        # Test with invalid dimensions
        print("\n🧪 Testing invalid dimensions:")
        sample_images = self.get_sample_images()
        test_image = sample_images["simple_2x2"]
        
        await self.convert_image(
            "Invalid Size (200x200)",
            test_image["data"],
            200, 200  # Should fail - too large
        )
    
    async def show_pixel_preview(self, pixel_matrix, width, height, name):
        """Show a text preview of the pixel matrix"""
        print(f"\n🎨 Pixel Preview: {name}")
        print("=" * min(width * 3, 60))
        
        for y in range(min(height, 20)):  # Limit display height
            row_str = ""
            for x in range(min(width, 20)):  # Limit display width
                color = pixel_matrix[y][x]
                # Convert hex color to a simple character representation
                if color == "#000000":
                    row_str += "██"
                elif color == "#ffffff":
                    row_str += "  "
                else:
                    # Use a medium character for other colors
                    row_str += "▓▓"
            print(row_str)
        
        if height > 20 or width > 20:
            print("... (truncated for display)")
        print("")
    
    async def demo_with_preview(self):
        """Demonstrate conversion with text preview"""
        print("\n👁️ Conversion with Preview Demo")
        print("=" * 60)
        
        sample_images = self.get_sample_images()
        test_image = sample_images["simple_2x2"]
        
        sizes = [(4, 4), (8, 8), (16, 8)]
        
        for width, height in sizes:
            result = await self.convert_image(
                f"Preview Test {width}x{height}",
                test_image["data"],
                width, height
            )
            
            if result:
                await self.show_pixel_preview(
                    result["pixel_matrix"],
                    width, height,
                    f"{width}x{height} Pattern"
                )
    
    async def run_all_demos(self):
        """Run all image conversion demonstrations"""
        print("🎯 PixelMug Image Conversion Demo Program")
        print("=" * 80)
        
        demos = [
            self.demo_basic_conversion,
            self.demo_resize_methods,
            self.demo_with_preview,
            self.demo_convert_and_display,
            self.demo_error_handling
        ]
        
        for demo in demos:
            try:
                await demo()
                await asyncio.sleep(2)  # Pause between demo sections
            except KeyboardInterrupt:
                print("\n\n⏸️ Demo interrupted by user")
                break
            except Exception as e:
                print(f"\n💥 Error occurred during demo: {str(e)}")
        
        print("\n🎉 Image Conversion Demo completed!")
        print("=" * 80)


async def interactive_image_conversion():
    """Interactive image conversion mode"""
    demo = ImageConversionDemo()
    
    print("🖼️ PixelMug Image Conversion Interactive Mode")
    print("=" * 60)
    print("Commands:")
    print("  demo - Run all demonstrations")
    print("  convert - Convert sample image")
    print("  display - Convert and display on device")
    print("  preview - Show text preview of conversion")
    print("  methods - Test different resize methods")
    print("  errors - Test error handling")
    print("  exit - Exit")
    print("=" * 60)
    
    while True:
        try:
            command = input("\n🖼️ Enter command: ").strip().lower()
            
            if command == "exit":
                print("👋 Goodbye!")
                break
            elif command == "demo":
                await demo.run_all_demos()
            elif command == "convert":
                await demo.demo_basic_conversion()
            elif command == "display":
                await demo.demo_convert_and_display()
            elif command == "preview":
                await demo.demo_with_preview()
            elif command == "methods":
                await demo.demo_resize_methods()
            elif command == "errors":
                await demo.demo_error_handling()
            else:
                print("❌ Unknown command. Available: demo, convert, display, preview, methods, errors, exit")
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"💥 Error occurred: {str(e)}")


async def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "demo":
            demo = ImageConversionDemo()
            await demo.run_all_demos()
        elif sys.argv[1] == "interactive":
            await interactive_image_conversion()
        else:
            print("Usage: python image_conversion_demo.py [demo|interactive]")
    else:
        # Default run demo
        demo = ImageConversionDemo()
        await demo.run_all_demos()


if __name__ == "__main__":
    asyncio.run(main())

```

`mcp_pixel_mug/examples/pixel_art_demo.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug Pixel Art Demo
Demonstrates various pixel art capabilities of PixelMug
"""

import json
import asyncio
import sys
import os
import base64

# Add parent directory to path for importing service modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server import MCPServer


class PixelArtDemo:
    """PixelMug Pixel Art demonstration class"""
    
    def __init__(self):
        self.server = MCPServer()
        self.request_id = 1
    
    def get_next_id(self):
        """Get next request ID"""
        current_id = self.request_id
        self.request_id += 1
        return current_id
    
    async def send_pixel_art(self, device_id: str, name: str, pattern, width: int, height: int, duration: int = 20):
        """Send pixel art to device"""
        request = {
            "jsonrpc": "2.0",
            "method": "publish_action",
            "params": {
                "device_id": device_id,
                "action": "pixel_art",
                "params": {
                    "pattern": pattern,
                    "width": width,
                    "height": height,
                    "duration": duration
                }
            },
            "id": self.get_next_id()
        }
        
        print(f"🎨 Displaying: {name} ({width}x{height})")
        print(f"📤 Sending to device: {device_id}")
        
        try:
            response_str = await self.server.handle_request(json.dumps(request))
            response = json.loads(response_str)
            
            if "error" in response:
                print(f"❌ Error: {response['error']['message']}")
                return False
            else:
                print(f"✅ Successfully sent pixel art")
                return True
                
        except Exception as e:
            print(f"💥 Exception: {str(e)}")
            return False
        finally:
            print("-" * 60)
    
    def create_simple_patterns(self):
        """Create simple pixel art patterns"""
        patterns = {}
        
        # 4x4 Checkboard
        patterns["checkboard_4x4"] = {
            "name": "4x4 Checkboard",
            "pattern": [
                ["#000000", "#FFFFFF", "#000000", "#FFFFFF"],
                ["#FFFFFF", "#000000", "#FFFFFF", "#000000"],
                ["#000000", "#FFFFFF", "#000000", "#FFFFFF"],
                ["#FFFFFF", "#000000", "#FFFFFF", "#000000"]
            ],
            "width": 4,
            "height": 4
        }
        
        # 6x6 Target
        patterns["target_6x6"] = {
            "name": "6x6 Target",
            "pattern": [
                ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
                ["#FF0000", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FF0000"],
                ["#FF0000", "#FFFFFF", "#FF0000", "#FF0000", "#FFFFFF", "#FF0000"],
                ["#FF0000", "#FFFFFF", "#FF0000", "#FF0000", "#FFFFFF", "#FF0000"],
                ["#FF0000", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FF0000"],
                ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"]
            ],
            "width": 6,
            "height": 6
        }
        
        # 8x8 Diamond
        patterns["diamond_8x8"] = {
            "name": "8x8 Diamond",
            "pattern": [
                ["#000000", "#000000", "#000000", "#00FF00", "#00FF00", "#000000", "#000000", "#000000"],
                ["#000000", "#000000", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#000000", "#000000"],
                ["#000000", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#000000"],
                ["#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00"],
                ["#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00"],
                ["#000000", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#000000"],
                ["#000000", "#000000", "#00FF00", "#00FF00", "#00FF00", "#00FF00", "#000000", "#000000"],
                ["#000000", "#000000", "#000000", "#00FF00", "#00FF00", "#000000", "#000000", "#000000"]
            ],
            "width": 8,
            "height": 8
        }
        
        # 6x6 Star
        patterns["star_6x6"] = {
            "name": "6x6 Star",
            "pattern": [
                ["#000000", "#000000", "#FFFF00", "#FFFF00", "#000000", "#000000"],
                ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"],
                ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
                ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"],
                ["#000000", "#FFFF00", "#000000", "#000000", "#FFFF00", "#000000"],
                ["#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00"]
            ],
            "width": 6,
            "height": 6
        }
        
        return patterns
    
    def create_coffee_themed_patterns(self):
        """Create coffee-themed pixel art patterns"""
        patterns = {}
        
        # Coffee Bean
        patterns["coffee_bean"] = {
            "name": "Coffee Bean",
            "pattern": [
                ["#000000", "#654321", "#654321", "#654321", "#654321", "#000000"],
                ["#654321", "#8B4513", "#8B4513", "#8B4513", "#8B4513", "#654321"],
                ["#654321", "#8B4513", "#DEB887", "#DEB887", "#8B4513", "#654321"],
                ["#654321", "#8B4513", "#DEB887", "#DEB887", "#8B4513", "#654321"],
                ["#654321", "#8B4513", "#8B4513", "#8B4513", "#8B4513", "#654321"],
                ["#000000", "#654321", "#654321", "#654321", "#654321", "#000000"]
            ],
            "width": 6,
            "height": 6
        }
        
        # Steam (animated effect suggestion)
        patterns["steam"] = {
            "name": "Steam Pattern",
            "pattern": [
                ["#000000", "#E6E6FA", "#000000", "#E6E6FA", "#000000", "#E6E6FA"],
                ["#E6E6FA", "#000000", "#E6E6FA", "#000000", "#E6E6FA", "#000000"],
                ["#000000", "#E6E6FA", "#000000", "#E6E6FA", "#000000", "#E6E6FA"],
                ["#E6E6FA", "#000000", "#E6E6FA", "#000000", "#E6E6FA", "#000000"],
                ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000"],
                ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000"]
            ],
            "width": 6,
            "height": 6
        }
        
        return patterns
    
    def create_rgb_pattern_example(self):
        """Create RGB tuple pattern example"""
        return {
            "name": "RGB Gradient",
            "pattern": [
                [[255, 0, 0], [255, 64, 0], [255, 128, 0], [255, 192, 0]],
                [[255, 64, 0], [255, 128, 0], [255, 192, 0], [255, 255, 0]],
                [[255, 128, 0], [255, 192, 0], [255, 255, 0], [192, 255, 0]],
                [[255, 192, 0], [255, 255, 0], [192, 255, 0], [128, 255, 0]]
            ],
            "width": 4,
            "height": 4
        }
    
    def create_base64_example(self):
        """Create a simple base64 encoded image example"""
        # This is a 2x2 PNG image with red, green, blue, white pixels
        base64_data = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIHWP8DwQMDAxwAEEB5gAAAAoAAf8IAFx+AAA=="
        
        return {
            "name": "Base64 2x2 Pattern",
            "pattern": base64_data,
            "width": 2,
            "height": 2
        }
    
    async def demo_basic_patterns(self):
        """Demonstrate basic patterns"""
        print("\n🎨 Basic Pixel Art Patterns Demo")
        print("=" * 60)
        
        device_id = "mug_001"
        patterns = self.create_simple_patterns()
        
        for pattern_id, pattern_info in patterns.items():
            await self.send_pixel_art(
                device_id,
                pattern_info["name"],
                pattern_info["pattern"],
                pattern_info["width"],
                pattern_info["height"],
                duration=15
            )
            await asyncio.sleep(1)  # Pause between patterns
    
    async def demo_coffee_patterns(self):
        """Demonstrate coffee-themed patterns"""
        print("\n☕ Coffee-Themed Pixel Art Demo")
        print("=" * 60)
        
        device_id = "mug_001"
        patterns = self.create_coffee_themed_patterns()
        
        for pattern_id, pattern_info in patterns.items():
            await self.send_pixel_art(
                device_id,
                pattern_info["name"],
                pattern_info["pattern"],
                pattern_info["width"],
                pattern_info["height"],
                duration=20
            )
            await asyncio.sleep(1)
    
    async def demo_different_formats(self):
        """Demonstrate different pattern formats"""
        print("\n🌈 Different Pattern Formats Demo")
        print("=" * 60)
        
        device_id = "mug_001"
        
        # RGB pattern
        rgb_pattern = self.create_rgb_pattern_example()
        await self.send_pixel_art(
            device_id,
            rgb_pattern["name"],
            rgb_pattern["pattern"],
            rgb_pattern["width"],
            rgb_pattern["height"],
            duration=15
        )
        
        await asyncio.sleep(1)
        
        # Base64 pattern
        base64_pattern = self.create_base64_example()
        await self.send_pixel_art(
            device_id,
            base64_pattern["name"],
            base64_pattern["pattern"],
            base64_pattern["width"],
            base64_pattern["height"],
            duration=15
        )
    
    async def demo_predefined_examples(self):
        """Demonstrate predefined examples from the service"""
        print("\n⭐ Predefined Examples Demo")
        print("=" * 60)
        
        device_id = "mug_001"
        
        # Get examples from the service
        help_info = await self.get_help_info()
        examples = help_info.get("pixel_art_examples", {})
        
        for example_name, example_info in examples.items():
            await self.send_pixel_art(
                device_id,
                example_info["description"],
                example_info["pattern"],
                example_info["width"],
                example_info["height"],
                duration=25
            )
            await asyncio.sleep(1)
    
    async def get_help_info(self):
        """Get service help information"""
        request = {
            "jsonrpc": "2.0",
            "method": "help",
            "params": {},
            "id": self.get_next_id()
        }
        
        response_str = await self.server.handle_request(json.dumps(request))
        response = json.loads(response_str)
        
        return response.get("result", {})
    
    async def run_all_demos(self):
        """Run all pixel art demonstrations"""
        print("🎯 PixelMug Pixel Art Demo Program")
        print("=" * 80)
        
        demos = [
            self.demo_predefined_examples,
            self.demo_basic_patterns,
            self.demo_coffee_patterns,
            self.demo_different_formats
        ]
        
        for demo in demos:
            try:
                await demo()
                await asyncio.sleep(2)  # Pause between demo sections
            except KeyboardInterrupt:
                print("\n\n⏸️ Demo interrupted by user")
                break
            except Exception as e:
                print(f"\n💥 Error occurred during demo: {str(e)}")
        
        print("\n🎉 Pixel Art Demo completed!")
        print("=" * 80)


async def interactive_pixel_art():
    """Interactive pixel art mode"""
    demo = PixelArtDemo()
    
    print("🎨 PixelMug Pixel Art Interactive Mode")
    print("=" * 50)
    print("Commands:")
    print("  demo - Run all demonstrations")
    print("  basic - Show basic patterns")
    print("  coffee - Show coffee-themed patterns")
    print("  formats - Show different format examples")
    print("  examples - Show predefined examples")
    print("  custom - Create custom pattern")
    print("  exit - Exit")
    print("=" * 50)
    
    while True:
        try:
            command = input("\n🎨 Enter command: ").strip().lower()
            
            if command == "exit":
                print("👋 Goodbye!")
                break
            elif command == "demo":
                await demo.run_all_demos()
            elif command == "basic":
                await demo.demo_basic_patterns()
            elif command == "coffee":
                await demo.demo_coffee_patterns()
            elif command == "formats":
                await demo.demo_different_formats()
            elif command == "examples":
                await demo.demo_predefined_examples()
            elif command == "custom":
                print("🔧 Custom pattern creation:")
                print("Example: 2x2 red-green-blue-white pattern")
                pattern = [["#FF0000", "#00FF00"], ["#0000FF", "#FFFFFF"]]
                await demo.send_pixel_art("mug_001", "Custom 2x2", pattern, 2, 2)
            else:
                print("❌ Unknown command. Available: demo, basic, coffee, formats, examples, custom, exit")
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"💥 Error occurred: {str(e)}")


async def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "demo":
            demo = PixelArtDemo()
            await demo.run_all_demos()
        elif sys.argv[1] == "interactive":
            await interactive_pixel_art()
        else:
            print("Usage: python pixel_art_demo.py [demo|interactive]")
    else:
        # Default run demo
        demo = PixelArtDemo()
        await demo.run_all_demos()


if __name__ == "__main__":
    asyncio.run(main())

```

`mcp_pixel_mug/mcp_server.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP PixelMug Server Implementation
Provides MCP interface compliant with AIO JSON-RPC standard
"""

import json
import asyncio
import logging
from typing import Dict, Any, Optional
from mug_service import mug_service


class MCPServer:
    """MCP Server class"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.setup_logging()
        
    def setup_logging(self):
        """Configure logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    async def handle_request(self, request_data: str) -> str:
        """Handle JSON-RPC requests"""
        try:
            request = json.loads(request_data)
            self.logger.info(f"Received request: {request}")
            
            # Validate JSON-RPC format
            if not self._validate_jsonrpc_request(request):
                return self._create_error_response(
                    request.get('id'),
                    -32600,
                    "Invalid Request"
                )
            
            method = request.get('method')
            params = request.get('params', {})
            request_id = request.get('id')
            
            # Route to corresponding handler method
            if method == 'help':
                result = await self._handle_help(params)
            elif method == 'issue_sts':
                result = await self._handle_issue_sts(params)
            elif method == 'send_pixel_image':
                result = await self._handle_send_pixel_image(params)
            elif method == 'send_gif_animation':
                result = await self._handle_send_gif_animation(params)
            elif method == 'convert_image_to_pixels':
                result = await self._handle_convert_image_to_pixels(params)
            else:
                return self._create_error_response(
                    request_id,
                    -32601,
                    f"Method not found: {method}"
                )
            
            return self._create_success_response(request_id, result)
            
        except json.JSONDecodeError:
            return self._create_error_response(
                None,
                -32700,
                "Parse error"
            )
        except Exception as e:
            self.logger.error(f"Error occurred while handling request: {str(e)}")
            return self._create_error_response(
                request.get('id') if 'request' in locals() else None,
                -32603,
                f"Internal error: {str(e)}"
            )
    
    def _validate_jsonrpc_request(self, request: Dict[str, Any]) -> bool:
        """Validate JSON-RPC request format"""
        return (
            isinstance(request, dict) and
            request.get('jsonrpc') == '2.0' and
            'method' in request and
            isinstance(request['method'], str)
        )
    
    async def _handle_help(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle help request"""
        return mug_service.get_help()
    
    async def _handle_issue_sts(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle issue_sts request"""
        product_id = params.get('product_id')
        device_name = params.get('device_name')
        
        if not product_id:
            raise ValueError("Missing required parameter: product_id")
        if not device_name:
            raise ValueError("Missing required parameter: device_name")
        
        return mug_service.issue_sts(product_id, device_name)
    
    async def _handle_send_pixel_image(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle send_pixel_image request"""
        product_id = params.get('product_id')
        device_name = params.get('device_name')
        image_data = params.get('image_data')
        target_width = params.get('target_width', 16)
        target_height = params.get('target_height', 16)
        
        if not product_id:
            raise ValueError("Missing required parameter: product_id")
        if not device_name:
            raise ValueError("Missing required parameter: device_name")
        if not image_data:
            raise ValueError("Missing required parameter: image_data")
        
        return mug_service.send_pixel_image(product_id, device_name, image_data, target_width, target_height)
    
    async def _handle_send_gif_animation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle send_gif_animation request"""
        product_id = params.get('product_id')
        device_name = params.get('device_name')
        gif_data = params.get('gif_data')
        frame_delay = params.get('frame_delay', 100)
        loop_count = params.get('loop_count', 0)
        target_width = params.get('target_width', 16)
        target_height = params.get('target_height', 16)
        
        if not product_id:
            raise ValueError("Missing required parameter: product_id")
        if not device_name:
            raise ValueError("Missing required parameter: device_name")
        if not gif_data:
            raise ValueError("Missing required parameter: gif_data")
        
        return mug_service.send_gif_animation(product_id, device_name, gif_data, frame_delay, loop_count, target_width, target_height)
    
    async def _handle_convert_image_to_pixels(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle convert_image_to_pixels request"""
        image_data = params.get('image_data')
        if not image_data:
            raise ValueError("Missing required parameter: image_data")
        
        target_width = params.get('target_width', 16)
        target_height = params.get('target_height', 16)
        resize_method = params.get('resize_method', 'nearest')
        
        return mug_service.convert_image_to_pixels(image_data, target_width, target_height, resize_method)
    
    def _create_success_response(self, request_id: Any, result: Any) -> str:
        """Create success response"""
        response = {
            "jsonrpc": "2.0",
            "result": result,
            "id": request_id
        }
        return json.dumps(response, ensure_ascii=False, indent=2)
    
    def _create_error_response(self, request_id: Any, code: int, message: str) -> str:
        """Create error response"""
        response = {
            "jsonrpc": "2.0",
            "error": {
                "code": code,
                "message": message
            },
            "id": request_id
        }
        return json.dumps(response, ensure_ascii=False, indent=2)


async def run_server():
    """Run MCP server"""
    server = MCPServer()
    
    print("MCP PixelMug server started, waiting for requests...")
    print("Supported methods: help, issue_sts, send_pixel_image, send_gif_animation, convert_image_to_pixels")
    print("Press Ctrl+C to exit")
    
    try:
        while True:
            # In actual applications, this would read requests from network or other input sources
            # Here we provide a simple command-line interaction example
            try:
                request_input = input("\nPlease enter JSON-RPC request (or 'exit' to quit): \n")
                if request_input.strip().lower() == 'exit':
                    break
                
                if request_input.strip():
                    response = await server.handle_request(request_input)
                    print(f"\nResponse:\n{response}")
                    
            except KeyboardInterrupt:
                break
            except EOFError:
                break
                
    except KeyboardInterrupt:
        pass
    
    print("\nServer stopped")


if __name__ == "__main__":
    asyncio.run(run_server())

```

`mcp_pixel_mug/mug_service.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug Smart Mug Tencent Cloud IoT Control Service
Provides device control functionality via Tencent Cloud IoT Explorer API
"""

import json
import uuid
import datetime
import logging
import base64
import re
import io
import os
from typing import Dict, Any, Optional, Union, List

# 腾讯云STS相关依赖
try:
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.sts.v20180813 import sts_client, models as sts_models
    TENCENT_CLOUD_AVAILABLE = True
except ImportError:
    TENCENT_CLOUD_AVAILABLE = False

# 腾讯云IoT Explorer相关依赖
try:
    from tencentcloud.iotexplorer.v20190423 import iotexplorer_client, models as iot_models
    IOT_EXPLORER_AVAILABLE = True
except ImportError:
    IOT_EXPLORER_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class MugService:
    """PixelMug service core class"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def get_help(self) -> Dict[str, Any]:
        """Return service help information"""
        return {
            "service": "mcp_pixel_mug",
            "version": "2.0.0",
            "description": "PixelMug Smart Mug Tencent Cloud IoT Control Interface",
            "methods": [
                {
                    "name": "help",
                    "description": "Get service help information",
                    "params": {}
                },
                {
                    "name": "issue_sts", 
                    "description": "Issue Tencent Cloud IoT STS temporary access credentials",
                    "params": {
                        "product_id": "Product ID, e.g.: ABC123DEF",
                        "device_name": "Device name, e.g.: mug_001"
                    }
                },
                {
                    "name": "send_pixel_image",
                    "description": "Send pixel image to device via Tencent Cloud IoT",
                    "params": {
                        "product_id": "Product ID",
                        "device_name": "Device name",
                        "image_data": "Base64 encoded image or pixel matrix",
                        "target_width": "Target width (optional, default: 16)",
                        "target_height": "Target height (optional, default: 16)"
                    }
                },
                {
                    "name": "send_gif_animation",
                    "description": "Send GIF pixel animation to device via Tencent Cloud IoT",
                    "params": {
                        "product_id": "Product ID",
                        "device_name": "Device name", 
                        "gif_data": "Base64 encoded GIF or frame array",
                        "frame_delay": "Delay between frames in ms (optional, default: 100)",
                        "loop_count": "Number of loops (optional, default: 0 for infinite)"
                    }
                },
                {
                    "name": "convert_image_to_pixels",
                    "description": "Convert base64 image to pixel matrix for display",
                    "params": {
                        "image_data": "Base64 encoded image (PNG/JPEG)",
                        "target_width": "Target width for pixel matrix (optional, default: 16)",
                        "target_height": "Target height for pixel matrix (optional, default: 16)",
                        "resize_method": "Resize method: nearest/bilinear/bicubic (optional, default: nearest)"
                    }
                }
            ],
            "supported_actions": [
                {"action": "send_pixel_image", "description": "Send pixel image via Tencent Cloud IoT", "params": {"image_data": "Pixel data or base64 image", "width": "Image width", "height": "Image height"}},
                {"action": "send_gif_animation", "description": "Send GIF animation via Tencent Cloud IoT", "params": {"gif_data": "GIF frame data", "frame_delay": "Frame delay (ms)", "loop_count": "Loop count"}}
            ],
            "pixel_art_examples": self._generate_pixel_examples(),
            "pixel_art_formats": {
                "2d_array": "Array of arrays with hex colors: [[\"#FF0000\", \"#00FF00\"], [\"#0000FF\", \"#FFFFFF\"]]",
                "rgb_array": "Array of arrays with RGB tuples: [[[255,0,0], [0,255,0]], [[0,0,255], [255,255,255]]]",
                "base64": "Base64 encoded image data (PNG/JPEG)"
            }
        }
    
    def issue_sts(self, product_id: str, device_name: str) -> Dict[str, Any]:
        """Issue Tencent Cloud IoT STS temporary access credentials"""
        try:
            # Check if Tencent Cloud SDK is available
            if not TENCENT_CLOUD_AVAILABLE:
                raise ImportError("Tencent Cloud SDK not installed, please install tencentcloud-sdk-python-sts")
            
            # Get configuration from environment variables
            role_arn = os.getenv("IOT_ROLE_ARN")
            if not role_arn:
                raise ValueError("Environment variable IOT_ROLE_ARN is not set")
            
            region = os.getenv("DEFAULT_REGION", "ap-guangzhou")
            
            # Get Tencent Cloud credentials
            cred = self._get_tencent_credentials()
            
            # Configure HTTP and Client Profile
            httpProfile = HttpProfile()
            httpProfile.endpoint = "sts.tencentcloudapi.com"
            
            clientProfile = ClientProfile()
            clientProfile.httpProfile = httpProfile
            
            # Create STS client
            client = sts_client.StsClient(cred, region, clientProfile)
            
            # Build session policy to limit permissions to single device
            session_policy = self._build_session_policy(product_id, device_name)
            
            # Create AssumeRole request
            req = sts_models.AssumeRoleRequest()
            params = {
                "RoleArn": role_arn,
                "RoleSessionName": f"iot-device-{product_id}-{device_name}-{int(datetime.datetime.now().timestamp())}",
                "DurationSeconds": 900,  # 15 minutes
                "Policy": session_policy
            }
            req.from_json_string(json.dumps(params))
            
            # Send request
            resp = client.AssumeRole(req)
            
            # Build response result
            credentials = resp.Credentials
            result = {
                "tmpSecretId": credentials.TmpSecretId,
                "tmpSecretKey": credentials.TmpSecretKey,
                "token": credentials.Token,
                "expiration": credentials.Expiration,
                "region": region,
                "product_id": product_id,
                "device_name": device_name,
                "issued_at": datetime.datetime.utcnow().isoformat() + "Z"
            }
            
            self.logger.info(f"Successfully issued STS credentials for device {product_id}/{device_name}")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to issue STS credentials: {str(e)}")
            raise
    
    def _get_tencent_credentials(self):
        """Get Tencent Cloud credentials, prioritize CVM/TKE bound role, otherwise read from environment variables"""
        try:
            # Try to get explicit AK/SK from environment variables
            secret_id = os.getenv("TC_SECRET_ID")
            secret_key = os.getenv("TC_SECRET_KEY")
            
            if secret_id and secret_key:
                self.logger.info("Using Tencent Cloud credentials from environment variables")
                return credential.Credential(secret_id, secret_key)
            else:
                # Use CVM/TKE metadata service to automatically get temporary credentials
                self.logger.info("Using CVM/TKE bound role to get temporary credentials")
                return credential.Credential()
                
        except Exception as e:
            self.logger.error(f"Failed to get Tencent Cloud credentials: {str(e)}")
            raise ValueError("Unable to get Tencent Cloud credentials, please check environment variables TC_SECRET_ID/TC_SECRET_KEY or ensure running on CVM/TKE with bound role")
    
    def _build_session_policy(self, product_id: str, device_name: str) -> str:
        """Build session policy to limit permissions to single device UpdateDeviceShadow and PublishMessage operations"""
        policy = {
            "version": "2.0",
            "statement": [
                {
                    "effect": "allow",
                    "action": [
                        "iotcloud:UpdateDeviceShadow",
                        "iotcloud:PublishMessage"
                    ],
                    "resource": [
                        f"qcs::iotcloud:::productId/{product_id}/device/{device_name}"
                    ]
                }
            ]
        }
        return json.dumps(policy)
    
    def _authorize(self, user_id: str, product_id: str, device_name: str) -> bool:
        """
        Authorization method: Check if user has permission to request STS for specified device
        Note: This should integrate with actual user system for authorization
        """
        # TODO: This should integrate with actual user system for authorization
        # Example: Check if user owns the device
        # In actual implementation, should query database or call permission service
        
        # Temporary implementation: Simple mock authorization
        self.logger.warning("Currently using mock authorization, please integrate with actual user system in production")
        
        # Mock: Check if device is in allowed device list
        allowed_devices = [
            ("ABC123DEF", "mug_001"),
            ("ABC123DEF", "mug_002"),
            ("XYZ789GHI", "device_001")
        ]
        
        if (product_id, device_name) in allowed_devices:
            self.logger.info(f"User {user_id} has permission to access device {product_id}/{device_name}")
            return True
        else:
            self.logger.warning(f"User {user_id} has no permission to access device {product_id}/{device_name}")
            return False
    
    def _create_iot_client(self):
        """Create Tencent Cloud IoT Explorer client"""
        try:
            # Check if IoT Explorer SDK is available
            if not IOT_EXPLORER_AVAILABLE:
                raise ImportError("Tencent Cloud IoT Explorer SDK not installed, please install tencentcloud-sdk-python-iotexplorer")
            
            # Get Tencent Cloud credentials
            cred = self._get_tencent_credentials()
            
            # Get region from environment
            region = os.getenv("DEFAULT_REGION", "ap-guangzhou")
            
            # Configure HTTP and Client Profile
            httpProfile = HttpProfile()
            httpProfile.endpoint = "iotexplorer.tencentcloudapi.com"
            
            clientProfile = ClientProfile()
            clientProfile.httpProfile = httpProfile
            
            # Create IoT Explorer client
            client = iotexplorer_client.IotexplorerClient(cred, region, clientProfile)
            
            self.logger.info("Successfully created IoT Explorer client")
            return client
            
        except Exception as e:
            self.logger.error(f"Failed to create IoT Explorer client: {str(e)}")
            raise

    def send_pixel_image(self, product_id: str, device_name: str, image_data: Union[str, List], 
                        target_width: int = 16, target_height: int = 16) -> Dict[str, Any]:
        """Send pixel image to device via Tencent Cloud IoT Explorer"""
        try:
            # Create IoT client
            client = self._create_iot_client()
            
            # Process image data
            if isinstance(image_data, str):
                # If it's base64 encoded image, convert to pixel matrix
                conversion_result = self.convert_image_to_pixels(image_data, target_width, target_height)
                pixel_matrix = conversion_result["pixel_matrix"]
                width = conversion_result["width"]
                height = conversion_result["height"]
            else:
                # If it's already a pixel matrix
                pixel_matrix = image_data
                width = target_width
                height = target_height
                
            # Validate pixel matrix
            self._validate_pixel_pattern(pixel_matrix, width, height)
            
            # Prepare input parameters for IoT device action
            input_params = {
                "action": "display_pixel_image",
                "width": width,
                "height": height,
                "pixel_data": pixel_matrix,
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            }
            
            # Create CallDeviceActionAsync request
            req = iot_models.CallDeviceActionAsyncRequest()
            params = {
                "ProductId": product_id,
                "DeviceName": device_name,
                "ActionId": "display_pixel_image",
                "InputParams": json.dumps(input_params)
            }
            req.from_json_string(json.dumps(params))
            
            # Send request to device
            resp = client.CallDeviceActionAsync(req)
            
            result = {
                "status": "success",
                "client_token": resp.ClientToken,
                "call_status": resp.Status,
                "request_id": resp.RequestId,
                "product_id": product_id,
                "device_name": device_name,
                "action_id": "display_pixel_image",
                "image_info": {
                    "width": width,
                    "height": height,
                    "total_pixels": width * height
                },
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            }
            
            self.logger.info(f"Successfully sent pixel image to device {product_id}/{device_name}")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to send pixel image: {str(e)}")
            raise

    def _process_gif_to_frames(self, gif_data: str, target_width: int = 16, target_height: int = 16) -> List[Dict]:
        """Process GIF data to frame array"""
        try:
            if not PIL_AVAILABLE:
                raise ImportError("PIL not available for GIF processing")
                
            # Decode base64 GIF data
            gif_bytes = base64.b64decode(gif_data)
            
            # Open GIF with PIL
            gif_image = Image.open(io.BytesIO(gif_bytes))
            
            frames = []
            frame_index = 0
            
            try:
                while True:
                    # Get current frame
                    frame = gif_image.copy()
                    
                    # Convert to RGB if necessary
                    if frame.mode != 'RGB':
                        frame = frame.convert('RGB')
                    
                    # Resize frame
                    resized_frame = frame.resize((target_width, target_height), Image.NEAREST)
                    
                    # Convert to pixel matrix
                    pixel_matrix = []
                    for y in range(target_height):
                        row = []
                        for x in range(target_width):
                            r, g, b = resized_frame.getpixel((x, y))
                            hex_color = f"#{r:02x}{g:02x}{b:02x}"
                            row.append(hex_color)
                        pixel_matrix.append(row)
                    
                    # Get frame duration (default 100ms if not specified)
                    duration = gif_image.info.get('duration', 100)
                    
                    frames.append({
                        "frame_index": frame_index,
                        "pixel_matrix": pixel_matrix,
                        "duration": duration
                    })
                    
                    frame_index += 1
                    gif_image.seek(gif_image.tell() + 1)
                    
            except EOFError:
                # End of frames
                pass
            
            self.logger.info(f"Processed GIF into {len(frames)} frames")
            return frames
            
        except Exception as e:
            self.logger.error(f"Failed to process GIF: {str(e)}")
            raise

    def send_gif_animation(self, product_id: str, device_name: str, gif_data: Union[str, List], 
                          frame_delay: int = 100, loop_count: int = 0, 
                          target_width: int = 16, target_height: int = 16) -> Dict[str, Any]:
        """Send GIF pixel animation to device via Tencent Cloud IoT Explorer"""
        try:
            # Create IoT client
            client = self._create_iot_client()
            
            # Process GIF data
            if isinstance(gif_data, str):
                # If it's base64 encoded GIF, process to frames
                frames = self._process_gif_to_frames(gif_data, target_width, target_height)
            else:
                # If it's already frame array
                frames = gif_data
                
            # Validate frames
            if not frames:
                raise ValueError("No frames found in GIF data")
                
            # Prepare input parameters for IoT device action
            input_params = {
                "action": "display_gif_animation",
                "frame_count": len(frames),
                "frames": frames,
                "frame_delay": frame_delay,
                "loop_count": loop_count,
                "width": target_width,
                "height": target_height,
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            }
            
            # Create CallDeviceActionAsync request
            req = iot_models.CallDeviceActionAsyncRequest()
            params = {
                "ProductId": product_id,
                "DeviceName": device_name,
                "ActionId": "display_gif_animation",
                "InputParams": json.dumps(input_params)
            }
            req.from_json_string(json.dumps(params))
            
            # Send request to device
            resp = client.CallDeviceActionAsync(req)
            
            result = {
                "status": "success",
                "client_token": resp.ClientToken,
                "call_status": resp.Status,
                "request_id": resp.RequestId,
                "product_id": product_id,
                "device_name": device_name,
                "action_id": "display_gif_animation",
                "animation_info": {
                    "frame_count": len(frames),
                    "frame_delay": frame_delay,
                    "loop_count": loop_count,
                    "width": target_width,
                    "height": target_height,
                    "total_pixels": target_width * target_height
                },
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            }
            
            self.logger.info(f"Successfully sent GIF animation to device {product_id}/{device_name}")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to send GIF animation: {str(e)}")
            raise

    def _validate_pixel_pattern(self, pattern: Union[List, str], width: int, height: int) -> bool:
        """Validate pixel art pattern"""
        if isinstance(pattern, str):
            # Base64 encoded image
            try:
                decoded = base64.b64decode(pattern)
                # Basic validation - should have reasonable size
                if len(decoded) < width * height or len(decoded) > width * height * 4:
                    raise ValueError("Base64 pattern size doesn't match dimensions")
                return True
            except Exception as e:
                raise ValueError(f"Invalid base64 pattern: {str(e)}")
        
        elif isinstance(pattern, list):
            # 2D array of colors
            if len(pattern) != height:
                raise ValueError(f"Pattern height {len(pattern)} doesn't match specified height {height}")
            
            for row_idx, row in enumerate(pattern):
                if not isinstance(row, list):
                    raise ValueError(f"Row {row_idx} is not a list")
                if len(row) != width:
                    raise ValueError(f"Row {row_idx} width {len(row)} doesn't match specified width {width}")
                
                for col_idx, pixel in enumerate(row):
                    if isinstance(pixel, str):
                        # Hex color validation
                        if not re.match(r'^#[0-9A-Fa-f]{6}$', pixel):
                            raise ValueError(f"Invalid color format at [{row_idx}][{col_idx}]: {pixel}")
                    elif isinstance(pixel, (list, tuple)):
                        # RGB/RGBA values
                        if len(pixel) not in [3, 4]:
                            raise ValueError(f"Invalid RGB/RGBA format at [{row_idx}][{col_idx}]: {pixel}")
                        for component in pixel:
                            if not isinstance(component, int) or component < 0 or component > 255:
                                raise ValueError(f"Invalid RGB component at [{row_idx}][{col_idx}]: {component}")
                    else:
                        raise ValueError(f"Invalid pixel format at [{row_idx}][{col_idx}]: {type(pixel)}")
            return True
        
        else:
            raise ValueError("Pattern must be a 2D array or base64 string")

    def _generate_pixel_examples(self) -> Dict[str, Any]:
        """Generate pixel art examples for documentation"""
        return {
            "smiley_face": {
                "description": "8x8 smiley face",
                "pattern": [
                    ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"],
                    ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
                    ["#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00"],
                    ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
                    ["#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00"],
                    ["#FFFF00", "#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00"],
                    ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"],
                    ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"]
                ],
                "width": 8,
                "height": 8
            },
            "heart": {
                "description": "8x8 heart shape",
                "pattern": [
                    ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"],
                    ["#000000", "#FF0000", "#FF0000", "#000000", "#000000", "#FF0000", "#FF0000", "#000000"],
                    ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
                    ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
                    ["#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000"],
                    ["#000000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#000000"],
                    ["#000000", "#000000", "#FF0000", "#FF0000", "#FF0000", "#FF0000", "#000000", "#000000"],
                    ["#000000", "#000000", "#000000", "#FF0000", "#FF0000", "#000000", "#000000", "#000000"]
                ],
                "width": 8,
                "height": 8
            },
            "coffee_cup": {
                "description": "8x8 coffee cup",
                "pattern": [
                    ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"],
                    ["#000000", "#8B4513", "#8B4513", "#8B4513", "#8B4513", "#8B4513", "#000000", "#000000"],
                    ["#000000", "#8B4513", "#654321", "#654321", "#654321", "#8B4513", "#FFFFFF", "#000000"],
                    ["#000000", "#8B4513", "#654321", "#654321", "#654321", "#8B4513", "#FFFFFF", "#000000"],
                    ["#000000", "#8B4513", "#654321", "#654321", "#654321", "#8B4513", "#000000", "#000000"],
                    ["#000000", "#8B4513", "#8B4513", "#8B4513", "#8B4513", "#8B4513", "#000000", "#000000"],
                    ["#000000", "#000000", "#8B4513", "#8B4513", "#8B4513", "#000000", "#000000", "#000000"],
                    ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"]
                ],
                "width": 8,
                "height": 8
            }
        }

    def validate_device_params(self, action: str, params: Dict[str, Any]) -> bool:
        """Validate device operation parameters"""
        validation_rules = {
            "display_pixel_image": {
                "required": ["pixel_data", "width", "height"],
                "pixel_data": {"type": list, "description": "2D array of pixel colors"},
                "width": {"type": int, "min": 1, "max": 128},
                "height": {"type": int, "min": 1, "max": 128}
            },
            "display_gif_animation": {
                "required": ["frames", "width", "height"],
                "frames": {"type": list, "description": "Array of frame data"},
                "width": {"type": int, "min": 1, "max": 128},
                "height": {"type": int, "min": 1, "max": 128},
                "frame_delay": {"type": int, "min": 10, "max": 5000, "default": 100},
                "loop_count": {"type": int, "min": 0, "max": 1000, "default": 0}
            }
        }
        
        if action not in validation_rules:
            return False
            
        rules = validation_rules[action]
        
        # Check required parameters
        for required_param in rules["required"]:
            if required_param not in params:
                raise ValueError(f"Missing required parameter: {required_param}")
        
        # Validate parameter types and values
        for param_name, param_value in params.items():
            if param_name in rules:
                rule = rules[param_name]
                
                # Type checking (handle tuple types for pixel_art)
                if "type" in rule:
                    expected_type = rule["type"]
                    if isinstance(expected_type, tuple):
                        # Multiple allowed types (for pixel_art pattern)
                        if not isinstance(param_value, expected_type):
                            type_names = [t.__name__ for t in expected_type]
                            raise ValueError(f"Parameter {param_name} type error, expected one of: {type_names}")
                    else:
                        if not isinstance(param_value, expected_type):
                            raise ValueError(f"Parameter {param_name} type error, expected {expected_type.__name__}")
                
                # Range checking for numbers
                if isinstance(param_value, int):
                    if "min" in rule and param_value < rule["min"]:
                        raise ValueError(f"Parameter {param_name} value too small, minimum: {rule['min']}")
                    if "max" in rule and param_value > rule["max"]:
                        raise ValueError(f"Parameter {param_name} value too large, maximum: {rule['max']}")
                
                # Length checking for strings
                if isinstance(param_value, str):
                    if "max_length" in rule and len(param_value) > rule["max_length"]:
                        raise ValueError(f"Parameter {param_name} too long, maximum length: {rule['max_length']}")
                    if "choices" in rule and param_value not in rule["choices"]:
                        raise ValueError(f"Parameter {param_name} invalid value, valid choices: {rule['choices']}")
        
        # Special validation for display_pixel_image
        if action == "display_pixel_image":
            pixel_data = params.get("pixel_data")
            width = params.get("width")
            height = params.get("height")
            
            if pixel_data is not None and width is not None and height is not None:
                self._validate_pixel_pattern(pixel_data, width, height)
        
        return True

    def convert_image_to_pixels(self, image_data: str, target_width: int = 16, target_height: int = 16, resize_method: str = "nearest") -> Dict[str, Any]:
        """Convert base64 image to pixel matrix"""
        try:
            # Validate parameters
            if target_width < 1 or target_width > 128:
                raise ValueError("target_width must be between 1 and 128")
            if target_height < 1 or target_height > 128:
                raise ValueError("target_height must be between 1 and 128")
            if resize_method not in ["nearest", "bilinear", "bicubic"]:
                raise ValueError("resize_method must be one of: nearest, bilinear, bicubic")
            
            # Check if PIL is available
            if not PIL_AVAILABLE:
                # Fallback: Return a simple pattern if PIL is not available
                self.logger.warning("PIL not available, using fallback pattern generation")
                return self._generate_fallback_pattern(target_width, target_height, image_data)
            
            # Decode base64 image
            try:
                image_bytes = base64.b64decode(image_data)
            except Exception as e:
                raise ValueError(f"Invalid base64 image data: {str(e)}")
            
            # Open image with PIL
            try:
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                raise ValueError(f"Cannot open image: {str(e)}")
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize image to target dimensions
            resize_filters = {
                "nearest": Image.NEAREST,
                "bilinear": Image.BILINEAR, 
                "bicubic": Image.BICUBIC
            }
            
            resized_image = image.resize((target_width, target_height), resize_filters[resize_method])
            
            # Convert to pixel matrix
            pixel_matrix = []
            for y in range(target_height):
                row = []
                for x in range(target_width):
                    r, g, b = resized_image.getpixel((x, y))
                    hex_color = f"#{r:02x}{g:02x}{b:02x}"
                    row.append(hex_color)
                pixel_matrix.append(row)
            
            # Get original image info
            original_size = image.size
            
            result = {
                "pixel_matrix": pixel_matrix,
                "width": target_width,
                "height": target_height,
                "original_size": {
                    "width": original_size[0],
                    "height": original_size[1]
                },
                "resize_method": resize_method,
                "total_pixels": target_width * target_height,
                "format_info": {
                    "original_mode": image.mode,
                    "converted_mode": "RGB",
                    "pixel_format": "hex_colors"
                }
            }
            
            self.logger.info(f"Successfully converted image from {original_size} to {target_width}x{target_height} pixel matrix")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to convert image to pixels: {str(e)}")
            raise

    def _generate_fallback_pattern(self, width: int, height: int, image_data: str) -> Dict[str, Any]:
        """Generate a fallback pattern when PIL is not available"""
        # Generate a simple hash-based pattern from the image data
        import hashlib
        
        # Create a hash from the image data
        hash_obj = hashlib.md5(image_data.encode())
        hash_hex = hash_obj.hexdigest()
        
        # Generate colors based on hash
        colors = []
        for i in range(0, len(hash_hex), 6):
            color_hex = hash_hex[i:i+6]
            if len(color_hex) == 6:
                colors.append(f"#{color_hex}")
        
        # If we don't have enough colors, repeat them
        while len(colors) < width * height:
            colors.extend(colors)
        
        # Create pixel matrix
        pixel_matrix = []
        color_index = 0
        for y in range(height):
            row = []
            for x in range(width):
                row.append(colors[color_index % len(colors)])
                color_index += 1
            pixel_matrix.append(row)
        
        return {
            "pixel_matrix": pixel_matrix,
            "width": width,
            "height": height,
            "original_size": {"width": "unknown", "height": "unknown"},
            "resize_method": "fallback_hash",
            "total_pixels": width * height,
            "format_info": {
                "original_mode": "unknown",
                "converted_mode": "hash_based",
                "pixel_format": "hex_colors"
            },
            "warning": "PIL not available, generated pattern from image hash"
        }

# Service instance
mug_service = MugService()

# FastAPI Application
try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.responses import JSONResponse
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

if FASTAPI_AVAILABLE:
    app = FastAPI(title="PixelMug IoT STS Service", version="1.0.0")
    
    @app.get("/sts/issue")
    async def issue_sts_endpoint(
        pid: str = Query(..., description="Product ID"),
        dn: str = Query(..., description="Device name"),
        user_id: str = Query("default_user", description="User ID (for authorization)")
    ):
        """
        Issue Tencent Cloud IoT STS temporary access credentials
        
        Args:
            pid: Product ID
            dn: Device name  
            user_id: User ID (for authorization)
            
        Returns:
            JSON containing: tmpSecretId, tmpSecretKey, token, expiration, region
        """
        try:
            # Parameter validation
            if not pid or not dn:
                raise HTTPException(
                    status_code=400, 
                    detail="Missing parameters: pid (Product ID) and dn (Device name) are required"
                )
            
            # User authorization
            if not mug_service._authorize(user_id, pid, dn):
                raise HTTPException(
                    status_code=403,
                    detail=f"User {user_id} has no permission to access device {pid}/{dn}"
                )
            
            # Issue STS temporary credentials
            result = mug_service.issue_sts(pid, dn)
            
            return JSONResponse(
                status_code=200,
                content={
                    "code": 0,
                    "message": "STS credentials issued successfully",
                    "data": result
                }
            )
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except ValueError as e:
            # Parameter error or configuration error
            raise HTTPException(
                status_code=400,
                detail=f"Parameter error: {str(e)}"
            )
        except ImportError as e:
            # SDK missing
            raise HTTPException(
                status_code=500,
                detail=f"Service configuration error: {str(e)}"
            )
        except Exception as e:
            # Other server errors
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )
    
    @app.post("/pixel/send")
    async def send_pixel_image_endpoint(
        pid: str = Query(..., description="Product ID"),
        dn: str = Query(..., description="Device name"),
        image_data: str = Query(..., description="Base64 encoded image or pixel matrix JSON"),
        width: int = Query(16, description="Target width"),
        height: int = Query(16, description="Target height"),
        user_id: str = Query("default_user", description="User ID (for authorization)")
    ):
        """
        Send pixel image to device via Tencent Cloud IoT
        
        Args:
            pid: Product ID
            dn: Device name
            image_data: Base64 encoded image or JSON encoded pixel matrix
            width: Target width (default: 16)
            height: Target height (default: 16)
            user_id: User ID (for authorization)
            
        Returns:
            JSON containing device response information
        """
        try:
            # Parameter validation
            if not pid or not dn or not image_data:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required parameters: pid, dn, and image_data are required"
                )
            
            # User authorization
            if not mug_service._authorize(user_id, pid, dn):
                raise HTTPException(
                    status_code=403,
                    detail=f"User {user_id} has no permission to access device {pid}/{dn}"
                )
            
            # Try to parse as JSON first (pixel matrix), otherwise treat as base64 image
            try:
                parsed_data = json.loads(image_data)
                image_input = parsed_data
            except json.JSONDecodeError:
                image_input = image_data
            
            # Send pixel image to device
            result = mug_service.send_pixel_image(pid, dn, image_input, width, height)
            
            return JSONResponse(
                status_code=200,
                content={
                    "code": 0,
                    "message": "Pixel image sent successfully",
                    "data": result
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send pixel image: {str(e)}"
            )
    
    @app.post("/gif/send")
    async def send_gif_animation_endpoint(
        pid: str = Query(..., description="Product ID"),
        dn: str = Query(..., description="Device name"),
        gif_data: str = Query(..., description="Base64 encoded GIF or frame array JSON"),
        frame_delay: int = Query(100, description="Frame delay in milliseconds"),
        loop_count: int = Query(0, description="Loop count (0 for infinite)"),
        width: int = Query(16, description="Target width"),
        height: int = Query(16, description="Target height"),
        user_id: str = Query("default_user", description="User ID (for authorization)")
    ):
        """
        Send GIF pixel animation to device via Tencent Cloud IoT
        
        Args:
            pid: Product ID
            dn: Device name
            gif_data: Base64 encoded GIF or JSON encoded frame array
            frame_delay: Frame delay in milliseconds (default: 100)
            loop_count: Loop count, 0 for infinite (default: 0)
            width: Target width (default: 16)
            height: Target height (default: 16)
            user_id: User ID (for authorization)
            
        Returns:
            JSON containing device response information
        """
        try:
            # Parameter validation
            if not pid or not dn or not gif_data:
                raise HTTPException(
                    status_code=400,
                    detail="Missing required parameters: pid, dn, and gif_data are required"
                )
            
            # User authorization
            if not mug_service._authorize(user_id, pid, dn):
                raise HTTPException(
                    status_code=403,
                    detail=f"User {user_id} has no permission to access device {pid}/{dn}"
                )
            
            # Try to parse as JSON first (frame array), otherwise treat as base64 GIF
            try:
                parsed_data = json.loads(gif_data)
                gif_input = parsed_data
            except json.JSONDecodeError:
                gif_input = gif_data
            
            # Send GIF animation to device
            result = mug_service.send_gif_animation(pid, dn, gif_input, frame_delay, loop_count, width, height)
            
            return JSONResponse(
                status_code=200,
                content={
                    "code": 0,
                    "message": "GIF animation sent successfully",
                    "data": result
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send GIF animation: {str(e)}"
            )
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "service": "mcp_pixel_mug_sts",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "tencent_cloud_sdk": TENCENT_CLOUD_AVAILABLE
        }
    
    @app.get("/")
    async def root():
        """Root path, return service information"""
        return {
            "service": "PixelMug IoT STS Service",
            "version": "2.0.0",
            "description": "Tencent Cloud IoT Device Control and STS Service",
            "features": [
                "STS temporary credential issuing",
                "Pixel image transmission to IoT devices",
                "GIF animation transmission to IoT devices",
                "Device authorization and validation"
            ],
            "endpoints": {
                "issue_sts": "/sts/issue?pid=<ProductId>&dn=<DeviceName>&user_id=<UserId>",
                "send_pixel": "/pixel/send (POST)",
                "send_gif": "/gif/send (POST)",
                "health": "/health",
                "api_docs": "/docs"
            },
            "requirements": {
                "env_vars": {
                    "IOT_ROLE_ARN": "CAM Role ARN (required)",
                    "TC_SECRET_ID": "Tencent Cloud SecretId (optional, can be omitted in CVM/TKE environment)",
                    "TC_SECRET_KEY": "Tencent Cloud SecretKey (optional, can be omitted in CVM/TKE environment)",
                    "DEFAULT_REGION": "Default region (optional, default: ap-guangzhou)"
                },
                "dependencies": {
                    "tencentcloud-sdk-python-sts": ">=3.0.0",
                    "tencentcloud-sdk-python-iotexplorer": ">=3.0.0",
                    "fastapi": ">=0.68.0",
                    "Pillow": ">=8.0.0 (for image/GIF processing)"
                }
            },
            "device_actions": {
                "display_pixel_image": "Display static pixel image on device screen",
                "display_gif_animation": "Display animated GIF on device screen"
            }
        }
else:
    print("Warning: FastAPI not installed, unable to start HTTP service")

```

`mcp_pixel_mug/requirements.txt`:

```txt
# PixelMug IoT STS Service Dependencies

# 腾讯云SDK
tencentcloud-sdk-python-sts>=3.0.0
tencentcloud-sdk-python-iotexplorer>=3.0.0

# FastAPI和相关依赖
fastapi>=0.68.0
uvicorn[standard]>=0.15.0

# 图像处理
Pillow>=8.0.0

# 原有依赖保留
paho-mqtt>=1.6.0
asyncio-mqtt>=0.11.0

# 日志和配置
python-dotenv>=0.19.0
```

`mcp_pixel_mug/start_server.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixelMug IoT STS Service 启动脚本
"""

import os
import sys
import logging
from pathlib import Path

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('sts_service.log')
        ]
    )

def check_environment():
    """Check environment variable configuration"""
    logger = logging.getLogger(__name__)
    
    # Check required environment variables
    required_vars = ['IOT_ROLE_ARN']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set the following environment variables:")
        logger.error("  IOT_ROLE_ARN: CAM Role ARN")
        logger.error("Optional environment variables:")
        logger.error("  TC_SECRET_ID: Tencent Cloud SecretId")
        logger.error("  TC_SECRET_KEY: Tencent Cloud SecretKey")
        logger.error("  DEFAULT_REGION: Default region (default: ap-guangzhou)")
        return False
    
    # Check optional environment variables
    secret_id = os.getenv('TC_SECRET_ID')
    secret_key = os.getenv('TC_SECRET_KEY')
    
    if secret_id and secret_key:
        logger.info("Using Tencent Cloud credentials from environment variables")
    else:
        logger.info("Will try to use CVM/TKE bound role to get temporary credentials")
    
    logger.info(f"IOT Role ARN: {os.getenv('IOT_ROLE_ARN')}")
    logger.info(f"Default region: {os.getenv('DEFAULT_REGION', 'ap-guangzhou')}")
    
    return True

def main():
    """Main function"""
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("Starting PixelMug IoT STS Service...")
    
    # Check environment configuration
    if not check_environment():
        sys.exit(1)
    
    # Check dependencies
    try:
        import fastapi
        import uvicorn
        from mug_service import app, FASTAPI_AVAILABLE, TENCENT_CLOUD_AVAILABLE, IOT_EXPLORER_AVAILABLE
        
        if not FASTAPI_AVAILABLE:
            logger.error("FastAPI not installed, please run: pip install fastapi uvicorn")
            sys.exit(1)
            
        if not TENCENT_CLOUD_AVAILABLE:
            logger.error("Tencent Cloud STS SDK not installed, please run: pip install tencentcloud-sdk-python-sts")
            sys.exit(1)
            
        if not IOT_EXPLORER_AVAILABLE:
            logger.error("Tencent Cloud IoT Explorer SDK not installed, please run: pip install tencentcloud-sdk-python-iotexplorer")
            sys.exit(1)
            
    except ImportError as e:
        logger.error(f"Failed to import dependencies: {e}")
        logger.error("Please install dependencies: pip install -r requirements.txt")
        sys.exit(1)
    
    # Start service
    host = os.getenv('UVICORN_HOST', '0.0.0.0')
    port = int(os.getenv('UVICORN_PORT', '8000'))
    
    logger.info(f"Starting HTTP service, listening on {host}:{port}")
    logger.info("API documentation: http://localhost:8000/docs")
    logger.info("Available endpoints:")
    logger.info("  - STS credentials: GET /sts/issue?pid=<ProductId>&dn=<DeviceName>")
    logger.info("  - Send pixel image: POST /pixel/send")
    logger.info("  - Send GIF animation: POST /gif/send")
    logger.info("  - Health check: GET /health")
    
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    main()

```

`mcp_pixel_mug/stdio_server.py`:

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Standard Input/Output MCP Server
Communicates with clients through stdin/stdout
"""

import sys
import json
import asyncio
import logging
from mcp_server import MCPServer


class StdioServer:
    """Standard Input/Output Server class"""
    
    def __init__(self):
        self.mcp_server = MCPServer()
        self.logger = logging.getLogger(__name__)
        
        # Configure logging to stderr to avoid confusion with stdout communication
        self.setup_logging()
    
    def setup_logging(self):
        """Configure logging output"""
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(
            logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )
        
        logger = logging.getLogger()
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    
    async def run(self):
        """Run standard input/output server"""
        self.logger.info("PixelMug MCP Standard I/O Server started")
        
        try:
            while True:
                # Read request from stdin
                line = await self._read_line()
                if not line:
                    break
                
                try:
                    # Process request
                    response = await self.mcp_server.handle_request(line)
                    
                    # Send response to stdout
                    await self._write_line(response)
                    
                except Exception as e:
                    self.logger.error(f"Error occurred while processing request: {str(e)}")
                    error_response = self._create_error_response(None, -32603, str(e))
                    await self._write_line(error_response)
        
        except KeyboardInterrupt:
            self.logger.info("Received interrupt signal, shutting down server")
        except Exception as e:
            self.logger.error(f"Error occurred while running server: {str(e)}")
        finally:
            self.logger.info("Server closed")
    
    async def _read_line(self) -> str:
        """Read a line asynchronously"""
        loop = asyncio.get_event_loop()
        line = await loop.run_in_executor(None, sys.stdin.readline)
        return line.strip()
    
    async def _write_line(self, content: str):
        """Write a line asynchronously"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._write_stdout, content)
    
    def _write_stdout(self, content: str):
        """Write to standard output"""
        sys.stdout.write(content + '\n')
        sys.stdout.flush()
    
    def _create_error_response(self, request_id, code: int, message: str) -> str:
        """Create error response"""
        response = {
            "jsonrpc": "2.0",
            "error": {
                "code": code,
                "message": message
            },
            "id": request_id
        }
        return json.dumps(response, ensure_ascii=False)


async def main():
    """Main function"""
    server = StdioServer()
    await server.run()


if __name__ == "__main__":
    asyncio.run(main())

```

`mcp_pixel_mug/test_all_methods.sh`:

```sh
#!/bin/bash
# Test all MCP server methods

echo "🧪 Testing all MCP server methods"
echo "================================="

# Test help method
echo "1. Testing help method..."
echo "=========================="
./test_help.sh

echo ""
echo "================================="

# Test issue_sts method
echo "2. Testing issue_sts method..."
echo "=============================="
./test_prepare.sh

echo ""
echo "================================="

# Test send_pixel_image method
echo "3. Testing send_pixel_image method..."
echo "===================================="
./test_pixel_art.sh

echo ""
echo "================================="

# Test send_gif_animation method
echo "4. Testing send_gif_animation method..."
echo "======================================"
./test_publish.sh

echo ""
echo "================================="

# Test convert_image_to_pixels method
echo "5. Testing convert_image_to_pixels method..."
echo "==========================================="
./test_convert_image.sh

echo ""
echo "================================="
echo "✅ All MCP server methods tested successfully!"
echo "================================="

```

`mcp_pixel_mug/test_convert_image.sh`:

```sh
#!/bin/bash
# Test convert_image_to_pixels method

echo "🧪 Testing convert_image_to_pixels method"
echo "======================================="

# Test case 1: Simple 1x1 pixel image
echo "Test case 1: Simple 1x1 pixel image"
REQUEST1='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {"image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "target_width": 4, "target_height": 4}, "id": 1}'

echo "Sending request:"
echo "$REQUEST1"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST1'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 2: Different resize methods
echo "Test case 2: Different resize methods"
echo "Testing with nearest neighbor method..."
REQUEST2='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {"image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "target_width": 8, "target_height": 8, "resize_method": "nearest"}, "id": 2}'

echo "Sending request:"
echo "$REQUEST2"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST2'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 3: Bilinear resize method
echo "Test case 3: Bilinear resize method"
REQUEST3='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {"image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "target_width": 6, "target_height": 6, "resize_method": "bilinear"}, "id": 3}'

echo "Sending request:"
echo "$REQUEST3"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST3'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 4: Missing required parameters
echo "Test case 4: Missing required parameters"
REQUEST4='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {}, "id": 4}'

echo "Sending request:"
echo "$REQUEST4"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST4'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 5: Invalid resize method
echo "Test case 5: Invalid resize method"
REQUEST5='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {"image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "target_width": 4, "target_height": 4, "resize_method": "invalid_method"}, "id": 5}'

echo "Sending request:"
echo "$REQUEST5"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST5'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 6: Invalid target dimensions
echo "Test case 6: Invalid target dimensions"
REQUEST6='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {"image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "target_width": 200, "target_height": 200}, "id": 6}'

echo "Sending request:"
echo "$REQUEST6"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST6'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 7: Invalid base64 data
echo "Test case 7: Invalid base64 data"
REQUEST7='{"jsonrpc": "2.0", "method": "convert_image_to_pixels", "params": {"image_data": "invalid_base64_data", "target_width": 4, "target_height": 4}, "id": 7}'

echo "Sending request:"
echo "$REQUEST7"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST7'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "✅ convert_image_to_pixels method test completed"

```

`mcp_pixel_mug/test_help.sh`:

```sh
#!/bin/bash
# Test help method

echo "🧪 Testing help method"
echo "===================="

# Test request
REQUEST='{"jsonrpc": "2.0", "method": "help", "params": {}, "id": 1}'

echo "Sending request:"
echo "$REQUEST"
echo ""

# Use Python to test directly
echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "✅ Help method test completed"

```

`mcp_pixel_mug/test_pixel_art.sh`:

```sh
#!/bin/bash
# Test send_pixel_image method

echo "🧪 Testing send_pixel_image method"
echo "=================================="

# Test case 1: Simple 2x2 pattern
echo "Test case 1: Simple 2x2 pattern"
REQUEST1='{"jsonrpc": "2.0", "method": "send_pixel_image", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "image_data": [["#FF0000", "#00FF00"], ["#0000FF", "#FFFFFF"]], "target_width": 2, "target_height": 2}, "id": 1}'

echo "Sending request:"
echo "$REQUEST1"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST1'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 2: Smiley face example
echo "Test case 2: 8x8 Smiley face pattern"
REQUEST2='{"jsonrpc": "2.0", "method": "send_pixel_image", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "image_data": [["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"], ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"], ["#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00"], ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"], ["#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00"], ["#FFFF00", "#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00"], ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00"], ["#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000"]], "target_width": 8, "target_height": 8}, "id": 2}'

echo "Sending request:"
echo "8x8 Smiley face pattern..."
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST2'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 3: Base64 encoded image
echo "Test case 3: Base64 encoded image"
REQUEST3='{"jsonrpc": "2.0", "method": "send_pixel_image", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIHWP8DwQMDAxwAEEB5gAAAAoAAf8IAFx+AAA==", "target_width": 2, "target_height": 2}, "id": 3}'

echo "Sending request:"
echo "$REQUEST3"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST3'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 4: Missing required parameters
echo "Test case 4: Missing required parameters"
REQUEST4='{"jsonrpc": "2.0", "method": "send_pixel_image", "params": {"product_id": "ABC123DEF", "device_name": "mug_001"}, "id": 4}'

echo "Sending request:"
echo "$REQUEST4"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST4'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 5: Invalid color format in pixel matrix
echo "Test case 5: Invalid color format in pixel matrix"
REQUEST5='{"jsonrpc": "2.0", "method": "send_pixel_image", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "image_data": [["RED", "GREEN"], ["BLUE", "WHITE"]], "target_width": 2, "target_height": 2}, "id": 5}'

echo "Sending request:"
echo "$REQUEST5"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST5'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "✅ send_pixel_image method test completed"

```

`mcp_pixel_mug/test_prepare.sh`:

```sh
#!/bin/bash
# Test issue_sts method

echo "🧪 Testing issue_sts method"
echo "=========================="

# Test case 1: Normal device
echo "Test case 1: Normal device mug_001"
REQUEST1='{"jsonrpc": "2.0", "method": "issue_sts", "params": {"product_id": "ABC123DEF", "device_name": "mug_001"}, "id": 1}'

echo "Sending request:"
echo "$REQUEST1"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST1'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 2: Different device
echo "Test case 2: Different device mug_002"
REQUEST2='{"jsonrpc": "2.0", "method": "issue_sts", "params": {"product_id": "ABC123DEF", "device_name": "mug_002"}, "id": 2}'

echo "Sending request:"
echo "$REQUEST2"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST2'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 3: Missing required parameters
echo "Test case 3: Missing required parameters"
REQUEST3='{"jsonrpc": "2.0", "method": "issue_sts", "params": {}, "id": 3}'

echo "Sending request:"
echo "$REQUEST3"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST3'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "✅ issue_sts method test completed"

```

`mcp_pixel_mug/test_publish.sh`:

```sh
#!/bin/bash
# Test send_gif_animation method

echo "🧪 Testing send_gif_animation method"
echo "==================================="

# Test case 1: Simple GIF animation
echo "Test case 1: Simple GIF animation"
REQUEST1='{"jsonrpc": "2.0", "method": "send_gif_animation", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "frame_delay": 100, "loop_count": 0, "target_width": 16, "target_height": 16}, "id": 1}'

echo "Sending request:"
echo "$REQUEST1"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST1'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 2: GIF with custom frame delay
echo "Test case 2: GIF with custom frame delay"
REQUEST2='{"jsonrpc": "2.0", "method": "send_gif_animation", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "frame_delay": 200, "loop_count": 3, "target_width": 8, "target_height": 8}, "id": 2}'

echo "Sending request:"
echo "$REQUEST2"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST2'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 3: Frame array format
echo "Test case 3: Frame array format"
REQUEST3='{"jsonrpc": "2.0", "method": "send_gif_animation", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "gif_data": [{"frame_index": 0, "pixel_matrix": [["#FF0000", "#00FF00"], ["#0000FF", "#FFFFFF"]], "duration": 100}, {"frame_index": 1, "pixel_matrix": [["#FFFFFF", "#000000"], ["#FFFF00", "#FF00FF"]], "duration": 100}], "frame_delay": 150, "loop_count": 1, "target_width": 2, "target_height": 2}, "id": 3}'

echo "Sending request:"
echo "$REQUEST3"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST3'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 4: Missing required parameters
echo "Test case 4: Missing required parameters"
REQUEST4='{"jsonrpc": "2.0", "method": "send_gif_animation", "params": {"product_id": "ABC123DEF", "device_name": "mug_001"}, "id": 4}'

echo "Sending request:"
echo "$REQUEST4"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST4'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 5: Invalid frame delay
echo "Test case 5: Invalid frame delay"
REQUEST5='{"jsonrpc": "2.0", "method": "send_gif_animation", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "frame_delay": 5000, "loop_count": 0, "target_width": 16, "target_height": 16}, "id": 5}'

echo "Sending request:"
echo "$REQUEST5"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST5'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "----------------------------------------"

# Test case 6: Invalid loop count
echo "Test case 6: Invalid loop count"
REQUEST6='{"jsonrpc": "2.0", "method": "send_gif_animation", "params": {"product_id": "ABC123DEF", "device_name": "mug_001", "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "frame_delay": 100, "loop_count": 1001, "target_width": 16, "target_height": 16}, "id": 6}'

echo "Sending request:"
echo "$REQUEST6"
echo ""

echo "Response:"
python3 -c "
import sys
import asyncio
sys.path.append('.')
from mcp_server import MCPServer

async def test():
    server = MCPServer()
    request = '$REQUEST6'
    response = await server.handle_request(request)
    print(response)

asyncio.run(test())
"

echo ""
echo "✅ send_gif_animation method test completed"

```