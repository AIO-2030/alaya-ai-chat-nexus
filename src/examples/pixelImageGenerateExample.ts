/**
 * Pixel Image Generate API Usage Examples
 * Demonstrates how to use AlayaMcpService's pixel image generation functionality
 */

import { alayaMcpService, PixelImageGenerateParams, PixelImageGenerateResponse } from '../services/alayaMcpService';

/**
 * Basic Usage Example
 */
export async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');
  
  try {
    // Basic parameters
    const params: PixelImageGenerateParams = {
      user_input: 'A cute little cat in pixel style',
      image_size: '512x512'
    };
    
    const result = await alayaMcpService.pixelImageGenerate(params);
    
    if (result.success) {
      console.log('✅ Image generation successful!');
      console.log(`📏 Image size: ${result.data?.image_size}`);
      console.log(`⏱️ Generation time: ${result.data?.generation_time_ms}ms`);
      console.log(`🎨 Generation parameters:`, result.data?.generation_params);
      
      // Save image to local file
      if (result.data?.image_base64) {
        const saveResult = await alayaMcpService.saveImageToFile(
          result.data.image_base64,
          undefined,
          'cute_cat_pixel.png'
        );
        
        if (saveResult.success) {
          console.log(`💾 Image saved: ${saveResult.filePath}`);
        }
      }
    } else {
      console.error('❌ Image generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error);
  }
}

/**
 * Advanced Parameters Usage Example
 */
export async function advancedUsageExample() {
  console.log('\n=== Advanced Parameters Usage Example ===');
  
  try {
    const params: PixelImageGenerateParams = {
      user_input: 'A pixel-style robot with blue theme and futuristic feel',
      negative_prompt: 'blurry, low quality, distorted',
      num_inference_steps: 30,
      guidance_scale: 8.5,
      seed: 42,
      image_size: '1024x1024'
    };
    
    const result = await alayaMcpService.pixelImageGenerate(params);
    
    if (result.success) {
      console.log('✅ Advanced parameters image generation successful!');
      console.log(`🎯 Seed value: ${result.data?.generation_params.seed}`);
      console.log(`🔧 Inference steps: ${result.data?.generation_params.num_inference_steps}`);
      console.log(`📐 Guidance scale: ${result.data?.generation_params.guidance_scale}`);
    } else {
      console.error('❌ Advanced parameters image generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error);
  }
}

/**
 * Batch Generation Example
 */
export async function batchGenerationExample() {
  console.log('\n=== Batch Generation Example ===');
  
  try {
    const requests: PixelImageGenerateParams[] = [
      {
        user_input: 'Pixel-style sun',
        image_size: '256x256'
      },
      {
        user_input: 'Pixel-style moon',
        image_size: '256x256'
      },
      {
        user_input: 'Pixel-style stars',
        image_size: '256x256'
      }
    ];
    
    console.log(`🚀 Starting batch generation of ${requests.length} images...`);
    const results = await alayaMcpService.batchPixelImageGenerate(requests, 2);
    
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.success) {
        successCount++;
        console.log(`✅ Image ${index + 1} generated successfully`);
      } else {
        console.log(`❌ Image ${index + 1} generation failed: ${result.error}`);
      }
    });
    
    console.log(`📊 Batch generation completed: ${successCount}/${requests.length} successful`);
  } catch (error) {
    console.error('❌ Batch generation exception:', error);
  }
}

/**
 * Retry Mechanism Example
 */
export async function retryMechanismExample() {
  console.log('\n=== Retry Mechanism Example ===');
  
  try {
    const params: PixelImageGenerateParams = {
      user_input: 'Pixel-style dragon in red and gold',
      image_size: '512x512'
    };
    
    console.log('🔄 Generating image with retry mechanism...');
    const result = await alayaMcpService.pixelImageGenerateWithRetry(
      params,
      3, // Maximum 3 retries
      2000 // Retry interval 2 seconds
    );
    
    if (result.success) {
      console.log('✅ Retry mechanism image generation successful!');
    } else {
      console.error('❌ Retry mechanism image generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Retry mechanism exception:', error);
  }
}

/**
 * Health Check Example
 */
export async function healthCheckExample() {
  console.log('\n=== Health Check Example ===');
  
  try {
    console.log('🏥 Checking service health status...');
    const health = await alayaMcpService.healthCheck();
    
    if (health.healthy) {
      console.log('✅ Service health status is good');
      console.log(`⚡ Response time: ${health.responseTime}ms`);
    } else {
      console.error('❌ Service health status is abnormal:', health.error);
    }
  } catch (error) {
    console.error('❌ Health check exception:', error);
  }
}

/**
 * Error Handling Example
 */
export async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  // Test empty input
  try {
    const result = await alayaMcpService.pixelImageGenerate({
      user_input: ''
    });
    console.log('Empty input test result:', result.success ? 'Unexpected success' : 'Correct failure');
  } catch (error) {
    console.log('Empty input exception:', error);
  }
  
  // Test invalid parameters
  try {
    const result = await alayaMcpService.pixelImageGenerate({
      user_input: 'test',
      num_inference_steps: 200, // Out of range
      guidance_scale: 25, // Out of range
      image_size: 'invalid_size' // Invalid format
    });
    console.log('Invalid parameters test result:', result.success ? 'Unexpected success' : 'Correct failure');
  } catch (error) {
    console.log('Invalid parameters exception:', error);
  }
}

/**
 * Run All Examples
 */
export async function runAllExamples() {
  console.log('🎨 Pixel Image Generate API Examples Started\n');
  
  await basicUsageExample();
  await advancedUsageExample();
  await batchGenerationExample();
  await retryMechanismExample();
  await healthCheckExample();
  await errorHandlingExample();
  
  console.log('\n🎉 All examples completed!');
}

// If running this file directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples().catch(console.error);
}
