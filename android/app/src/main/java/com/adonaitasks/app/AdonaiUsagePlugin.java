package com.adonaitasks.app;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AdonaiUsage")
public class AdonaiUsagePlugin extends Plugin {
    @PluginMethod
    public void getUsage(PluginCall call) {
        String range = call.getString("range", "day");
        boolean granted = hasUsageAccess();
        JSObject response = new JSObject();
        response.put("source", "android-usage-stats");
        response.put("range", range);
        response.put("permissionGranted", granted);

        if (!granted) {
            response.put("devices", new JSArray());
            call.resolve(response);
            return;
        }

        long[] currentWindow = rangeWindow(range, 0);
        long[] previousWindow = rangeWindow(range, 1);
        Map<String, Long> current = queryUsage(currentWindow[0], currentWindow[1]);
        Map<String, Long> previous = queryUsage(previousWindow[0], previousWindow[1]);
        JSArray items = new JSArray();
        List<Map.Entry<String, Long>> entries = sortedEntries(current);
        long totalMs = 0;
        long previousTotalMs = 0;

        for (Map.Entry<String, Long> entry : previous.entrySet()) {
            previousTotalMs += Math.max(0, entry.getValue());
        }

        for (Map.Entry<String, Long> entry : entries) {
            long ms = Math.max(0, entry.getValue());
            if (ms <= 0) continue;
            totalMs += ms;
            int minutes = Math.max(1, Math.round(ms / 60000f));
            int previousMinutes = Math.max(0, Math.round((previous.get(entry.getKey()) == null ? 0 : previous.get(entry.getKey())) / 60000f));
            JSObject item = new JSObject();
            item.put("name", entry.getKey());
            item.put("minutes", minutes);
            item.put("change", minutes - previousMinutes);
            item.put("tone", toneForApp(entry.getKey()));
            items.put(item);
        }

        int totalMinutes = totalMs > 0 ? Math.max(1, Math.round(totalMs / 60000f)) : 0;
        int previousMinutes = previousTotalMs > 0 ? Math.max(1, Math.round(previousTotalMs / 60000f)) : 0;
        JSObject device = new JSObject();
        device.put("id", "mobile");
        device.put("title", "Movil");
        device.put("subtitle", "Uso real de Android");
        device.put("totalMinutes", totalMinutes);
        device.put("previousDelta", totalMinutes - previousMinutes);
        device.put("recommendation", recommendationFor(entries));
        device.put("items", items);

        JSArray devices = new JSArray();
        devices.put(device);
        response.put("devices", devices);
        call.resolve(response);
    }

    @PluginMethod
    public void openUsageSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject response = new JSObject();
        response.put("opened", true);
        call.resolve(response);
    }

    private boolean hasUsageAccess() {
        Context context = getContext();
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private long[] rangeWindow(String range, int offset) {
        int days = 1;
        if ("week".equals(range)) days = 7;
        if ("month".equals(range)) days = 31;
        if ("year".equals(range)) days = 365;

        Calendar end = Calendar.getInstance();
        end.add(Calendar.DAY_OF_YEAR, -(days * offset));
        Calendar start = (Calendar) end.clone();
        start.add(Calendar.DAY_OF_YEAR, -days);
        return new long[] { start.getTimeInMillis(), end.getTimeInMillis() };
    }

    private Map<String, Long> queryUsage(long start, long end) {
        Map<String, Long> totals = new HashMap<>();
        UsageStatsManager manager = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        if (manager == null) return totals;
        List<UsageStats> stats = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);
        if (stats == null) return totals;

        for (UsageStats usage : stats) {
            long ms = usage.getTotalTimeInForeground();
            if (ms <= 0) continue;
            String label = appLabel(usage.getPackageName());
            totals.put(label, (totals.containsKey(label) ? totals.get(label) : 0L) + ms);
        }
        return totals;
    }

    private String appLabel(String packageName) {
        PackageManager packageManager = getContext().getPackageManager();
        try {
            ApplicationInfo info = packageManager.getApplicationInfo(packageName, 0);
            CharSequence label = packageManager.getApplicationLabel(info);
            if (label != null && label.length() > 0) return label.toString();
        } catch (PackageManager.NameNotFoundException ignored) {}
        return packageName;
    }

    private List<Map.Entry<String, Long>> sortedEntries(Map<String, Long> map) {
        List<Map.Entry<String, Long>> entries = new ArrayList<>(map.entrySet());
        Collections.sort(entries, (a, b) -> Long.compare(b.getValue(), a.getValue()));
        return entries;
    }

    private String toneForApp(String appName) {
        String lower = appName.toLowerCase();
        if (lower.contains("youtube") || lower.contains("tiktok") || lower.contains("instagram")) return "red";
        if (lower.contains("whatsapp") || lower.contains("telegram") || lower.contains("discord")) return "amber";
        if (lower.contains("chrome") || lower.contains("browser") || lower.contains("safari") || lower.contains("firefox")) return "blue";
        return "ink";
    }

    private String recommendationFor(List<Map.Entry<String, Long>> entries) {
        if (entries.isEmpty()) {
            return "Activa el permiso y usa el movil unos minutos para ver datos reales aqui.";
        }
        String appName = entries.get(0).getKey();
        return appName + " lidera tu consumo. Empieza reduciendo un bloque pequeno, no todo el dia.";
    }
}
