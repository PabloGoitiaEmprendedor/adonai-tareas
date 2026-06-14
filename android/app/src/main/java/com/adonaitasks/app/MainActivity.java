package com.adonaitasks.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdonaiUsagePlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "default",
                "Adonai Notificaciones",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificaciones de tareas y recordatorios de Adonai");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
}
