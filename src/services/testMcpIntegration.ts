// Test MCP Integration - Verify AIO Protocol parameter matching
import { alayaMcpService } from './alayaMcpService';

/**
 * Test MCP integration with AIO Protocol parameter matching
 */
export class McpIntegrationTest {
  
  /**
   * Test STS token retrieval via MCP
   */
  static async testSTSTokenRetrieval(): Promise<boolean> {
    try {
      console.log('[McpIntegrationTest] Testing STS token retrieval via MCP...');
      
      const result = await alayaMcpService.issueStsCredentials('TEST_PRODUCT', 'test_device');
      
      if (result.success && result.data) {
        console.log('[McpIntegrationTest] ✅ STS token retrieval successful');
        console.log('[McpIntegrationTest] Token info:', result.data);
        return true;
      } else {
        console.error('[McpIntegrationTest] ❌ STS token retrieval failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[McpIntegrationTest] ❌ STS token retrieval failed:', error);
      return false;
    }
  }

  /**
   * Test pixel image sending via MCP
   */
  static async testPixelImageSending(): Promise<boolean> {
    try {
      console.log('[McpIntegrationTest] Testing pixel image sending via MCP...');
      
      // Create a simple 2x2 pixel pattern
      const pixelData = [
        ["#FF0000", "#00FF00"],
        ["#0000FF", "#FFFFFF"]
      ];
      
      const result = await alayaMcpService.sendPixelImage({
        product_id: 'TEST_PRODUCT',
        device_name: 'test_device',
        image_data: JSON.stringify(pixelData),
        target_width: 2,
        target_height: 2,
        use_cos: false, // Disable COS for testing
        ttl_sec: 300
      });
      
      if (result.success) {
        console.log('[McpIntegrationTest] ✅ Pixel image sending successful');
        console.log('[McpIntegrationTest] Result:', result.data);
        return true;
      } else {
        console.error('[McpIntegrationTest] ❌ Pixel image sending failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[McpIntegrationTest] ❌ Pixel image sending failed:', error);
      return false;
    }
  }

  /**
   * Test GIF animation sending via MCP
   */
  static async testGifAnimationSending(): Promise<boolean> {
    try {
      console.log('[McpIntegrationTest] Testing GIF animation sending via MCP...');
      
      // Create a simple frame array
      const frameData = [
        {
          frame_index: 0,
          pixel_matrix: [
            ["#FF0000", "#00FF00"],
            ["#0000FF", "#FFFFFF"]
          ],
          duration: 100
        }
      ];
      
      const result = await alayaMcpService.sendGifAnimation({
        product_id: 'TEST_PRODUCT',
        device_name: 'test_device',
        gif_data: JSON.stringify(frameData),
        frame_delay: 100,
        loop_count: 1,
        target_width: 2,
        target_height: 2,
        use_cos: false, // Disable COS for testing
        ttl_sec: 300
      });
      
      if (result.success) {
        console.log('[McpIntegrationTest] ✅ GIF animation sending successful');
        console.log('[McpIntegrationTest] Result:', result.data);
        return true;
      } else {
        console.error('[McpIntegrationTest] ❌ GIF animation sending failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[McpIntegrationTest] ❌ GIF animation sending failed:', error);
      return false;
    }
  }

  /**
   * Test image conversion via MCP
   */
  static async testImageConversion(): Promise<boolean> {
    try {
      console.log('[McpIntegrationTest] Testing image conversion via MCP...');
      
      // Use a simple 1x1 pixel base64 image
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const result = await alayaMcpService.convertImageToPixels({
        image_data: base64Image,
        target_width: 2,
        target_height: 2,
        resize_method: 'nearest'
      });
      
      if (result.success) {
        console.log('[McpIntegrationTest] ✅ Image conversion successful');
        console.log('[McpIntegrationTest] Result:', result.data);
        return true;
      } else {
        console.error('[McpIntegrationTest] ❌ Image conversion failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[McpIntegrationTest] ❌ Image conversion failed:', error);
      return false;
    }
  }

  /**
   * Test IoT service message sending via MCP
   */
  static async testIoTServiceMessageSending(): Promise<boolean> {
    try {
      console.log('[McpIntegrationTest] Testing IoT service message sending via MCP...');
      
      // Initialize IoT service with test config
      const testConfig = {
        productId: 'TEST_PRODUCT',
        deviceName: 'test_device',
        region: 'ap-guangzhou',
        brokerUrl: 'ssl://test.mqtt.tencentcloudmq.com:8883',
        clientId: 'test_client'
      };
      
      // Create test message
      const testMessage = {
        topic: 'test/topic',
        payload: JSON.stringify([
          ["#FF0000", "#00FF00"],
          ["#0000FF", "#FFFFFF"]
        ]),
        qos: 1 as const,
        retain: false,
        messageType: 'pixel_art' as const,
        width: 2,
        height: 2,
        useCos: false,
        ttlSec: 300
      };
      
      const result = await alayaMcpService.sendPixelImage({
        product_id: 'TEST_PRODUCT',
        device_name: 'test_device',
        image_data: testMessage.payload,
        target_width: 2,
        target_height: 2,
        use_cos: false,
        ttl_sec: 300
      });
      
      if (result.success) {
        console.log('[McpIntegrationTest] ✅ IoT service message sending successful');
        return true;
      } else {
        console.error('[McpIntegrationTest] ❌ IoT service message sending failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[McpIntegrationTest] ❌ IoT service message sending failed:', error);
      return false;
    }
  }

  /**
   * Test device status query via MCP
   */
  static async testDeviceStatusQuery(): Promise<boolean> {
    try {
      console.log('[McpIntegrationTest] Testing device status query via MCP...');
      
      const result = await alayaMcpService.getDeviceStatus('TEST_PRODUCT', 'test_device');
      
      if (result.success) {
        console.log('[McpIntegrationTest] ✅ Device status query successful');
        console.log('[McpIntegrationTest] Device status:', result.data);
        return true;
      } else {
        console.error('[McpIntegrationTest] ❌ Device status query failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[McpIntegrationTest] ❌ Device status query failed:', error);
      return false;
    }
  }

  /**
   * Run all MCP integration tests
   */
  static async runAllTests(): Promise<{ passed: number; failed: number; total: number }> {
    console.log('[McpIntegrationTest] 🚀 Starting MCP integration tests...');
    
    const tests = [
      { name: 'STS Token Retrieval', test: this.testSTSTokenRetrieval },
      { name: 'Pixel Image Sending', test: this.testPixelImageSending },
      { name: 'GIF Animation Sending', test: this.testGifAnimationSending },
      { name: 'Image Conversion', test: this.testImageConversion },
      { name: 'IoT Service Message Sending', test: this.testIoTServiceMessageSending },
      { name: 'Device Status Query', test: this.testDeviceStatusQuery }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
      console.log(`[McpIntegrationTest] Running test: ${name}`);
      try {
        const result = await test();
        if (result) {
          passed++;
          console.log(`[McpIntegrationTest] ✅ ${name} - PASSED`);
        } else {
          failed++;
          console.log(`[McpIntegrationTest] ❌ ${name} - FAILED`);
        }
      } catch (error) {
        failed++;
        console.log(`[McpIntegrationTest] ❌ ${name} - FAILED with error:`, error);
      }
      console.log('---');
    }
    
    const total = passed + failed;
    console.log(`[McpIntegrationTest] 🎯 Test Results: ${passed}/${total} passed, ${failed}/${total} failed`);
    
    return { passed, failed, total };
  }
}

// Export for use in other modules
export default McpIntegrationTest;
