#import <React/RCTBridgeModule.h>

@interface PresetDSPModule : NSObject <RCTBridgeModule>
@end

@implementation PresetDSPModule

RCT_EXPORT_MODULE(PresetDSP);

RCT_EXPORT_METHOD(applyEqBands
                  : (NSString *)bandsJson sessionId
                  : (NSInteger)sessionId resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  (void)bandsJson;
  (void)sessionId;
  // See ENTITY_NAMES.md: full iOS realtime chain needs an AVAudioEngine graph outside RNTP playback.
  resolve(@NO);
}

RCT_EXPORT_METHOD(releaseEffects : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
{
  resolve(@YES);
}

@end
