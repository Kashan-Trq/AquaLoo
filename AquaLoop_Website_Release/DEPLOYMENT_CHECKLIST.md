# AquaLoop Deployment Checklist

## Cloud
- [ ] Supabase project created
- [ ] `SUPABASE_SETUP.sql` executed successfully
- [ ] Email/password Auth enabled
- [ ] GitHub repository created
- [ ] Project imported into Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL` added to Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` added to Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Vercel
- [ ] Vercel project redeployed after environment variables
- [ ] Landing page opens on `https://...vercel.app`
- [ ] Signup works
- [ ] Login works

## Device
- [ ] Device added in AquaLoop dashboard
- [ ] Device ID is unique
- [ ] Tank capacity entered
- [ ] Filter service capacity entered deliberately
- [ ] Device secret saved
- [ ] Vercel telemetry endpoint copied
- [ ] Wi-Fi SSID/password configured in firmware
- [ ] ESP32 pins confirmed
- [ ] ADC voltages safe for ESP32
- [ ] TDS calibrated
- [ ] Turbidity calibrated
- [ ] Flow calibrated
- [ ] Firmware uploaded

## Live test
- [ ] Serial Monitor says `Cloud telemetry OK (200)`
- [ ] Dashboard shows LIVE · GLOBAL
- [ ] TDS changes live
- [ ] Turbidity changes live
- [ ] Flow changes live
- [ ] Tank fill time changes with flow
- [ ] `Reset as empty` works
- [ ] Filter status card works
- [ ] Filter reset button works after service
- [ ] Second internet connection can view the device after login

## Competition fallback
- [ ] `AquaLoop-AC-PK-001` hotspot visible
- [ ] Local hotspot password known
- [ ] `http://192.168.4.1` opens
- [ ] Local TDS/turbidity/flow update without internet
