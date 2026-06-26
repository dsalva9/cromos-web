package com.cambiocromos.app;

import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NavigationBar")
public class NavigationBarPlugin extends Plugin {

    @PluginMethod
    public void setStyle(PluginCall call) {
        String style = call.getString("style");
        String colorHex = call.getString("color");
        
        if (style == null) {
            call.reject("Style is required ('light' or 'dark')");
            return;
        }

        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Window window = getActivity().getWindow();
                    
                    // Set window to draw system bar backgrounds
                    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

                    // Disable system contrast enforcement (scrim) on Android 10+ (API 29+)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        window.setNavigationBarContrastEnforced(false);
                    }
                    
                    // Set navigation bar color if provided
                    if (colorHex != null) {
                        try {
                            int color = Color.parseColor(colorHex);
                            window.setNavigationBarColor(color);
                        } catch (IllegalArgumentException e) {
                            // Invalid color hex format
                        }
                    }

                    // Style the navigation bar buttons (dark buttons for light mode, light buttons for dark mode)
                    boolean isLight = "light".equalsIgnoreCase(style);
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
                    if (controller != null) {
                        controller.setAppearanceLightNavigationBars(isLight);
                    }
                    
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Error styling navigation bar", e);
                }
            }
        });
    }
}
