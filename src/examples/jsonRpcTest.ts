// JSON-RPC 2.0 Test for pixel_image_generate
// This file demonstrates the correct JSON-RPC 2.0 format for pixel_image_generate

import { alayaMcpService } from '../services/alayaMcpService';

/**
 * Test JSON-RPC 2.0 pixel_image_generate implementation
 */
export async function testPixelImageGenerate() {
  console.log('🧪 Testing JSON-RPC 2.0 pixel_image_generate implementation...');

  try {
    // Test case 1: Basic request with required parameters only
    console.log('\n📝 Test Case 1: Basic request');
    const basicResult = await alayaMcpService.pixelImageGenerate({
      user_input: 'A cute cat'
    });
    console.log('Basic result:', basicResult);

    // Test case 2: Full request with all parameters
    console.log('\n📝 Test Case 2: Full request with all parameters');
    const fullResult = await alayaMcpService.pixelImageGenerate({
      user_input: 'A beautiful sunset over mountains',
      negative_prompt: 'blurry, low quality',
      num_inference_steps: 30,
      guidance_scale: 8.0,
      seed: 12345,
      image_size: '1024x1024'
    });
    console.log('Full result:', fullResult);

    // Test case 3: Error handling - empty input
    console.log('\n📝 Test Case 3: Error handling - empty input');
    const errorResult = await alayaMcpService.pixelImageGenerate({
      user_input: ''
    });
    console.log('Error result:', errorResult);

    // Test case 4: Batch processing
    console.log('\n📝 Test Case 4: Batch processing');
    const batchRequests = [
      { user_input: 'A red apple' },
      { user_input: 'A blue ocean' },
      { user_input: 'A green tree' }
    ];
    const batchResults = await alayaMcpService.batchPixelImageGenerate(batchRequests, 2);
    console.log('Batch results:', batchResults);

    // Test case 5: Health check
    console.log('\n📝 Test Case 5: Health check');
    const healthResult = await alayaMcpService.healthCheck();
    console.log('Health check result:', healthResult);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Demonstrate the JSON-RPC 2.0 request format
 */
export function demonstrateJsonRpcFormat() {
  console.log('📋 JSON-RPC 2.0 Request Format for pixel_image_generate:');
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    method: 'pixel_image_generate',
    params: {
      user_input: 'A cute cat',
      negative_prompt: '',
      num_inference_steps: 20,
      guidance_scale: 7.5,
      seed: null,
      image_size: '1024x1024'
    },
    id: 'pixel_image_generate_1234567890'
  }, null, 2));

  console.log('\n📋 Expected JSON-RPC 2.0 Response Format:');
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    result: {
      success: true,
      image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      image_size: '1024x1024',
      generation_params: {
        user_input: 'A cute cat',
        negative_prompt: '',
        num_inference_steps: 20,
        guidance_scale: 7.5,
        seed: null,
        image_size: '1024x1024'
      },
      generation_time_ms: 1500
    },
    id: 'pixel_image_generate_1234567890'
  }, null, 2));
}

// Functions are already exported above, no need to re-export
