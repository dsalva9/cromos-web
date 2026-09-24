package com.cambiocromos.app;

import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@CapacitorPlugin(name = "DeviceFingerprint")
public class DeviceFingerprintPlugin extends Plugin {

    @PluginMethod
    public void getFingerprint(PluginCall call) {
        try {
            String androidId = Settings.Secure.getString(
                getContext().getContentResolver(),
                Settings.Secure.ANDROID_ID
            );

            if (androidId == null || androidId.isEmpty()) {
                call.reject("Unable to retrieve device ID");
                return;
            }

            // SHA-256 hash the ANDROID_ID for privacy
            String hash = sha256(androidId);

            JSObject result = new JSObject();
            result.put("hash", hash);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting device fingerprint", e);
        }
    }

    private String sha256(String input) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(input.getBytes());

        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
