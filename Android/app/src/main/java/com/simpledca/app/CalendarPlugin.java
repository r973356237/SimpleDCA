package com.simpledca.app;

import android.content.Intent;
import android.provider.CalendarContract;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

/**
 * Capacitor 自定义插件：调用安卓系统日历 Intent 添加日程提醒。
 * 前端通过 Capacitor.Plugins.CalendarPlugin.addEvent(...) 调用。
 */
@CapacitorPlugin(name = "CalendarPlugin")
public class CalendarPlugin extends Plugin {

    @PluginMethod()
    public void addEvent(PluginCall call) {
        String title = call.getString("title", "简单定投提醒");
        String description = call.getString("description", "");
        // beginTime: 事件开始的 Unix 毫秒时间戳
        Long beginTime = call.getLong("beginTime");
        // allDay: 是否为全天事件
        Boolean allDay = call.getBoolean("allDay", true);

        if (beginTime == null) {
            // 如果没有传入时间，默认使用当前时间
            beginTime = System.currentTimeMillis();
        }

        try {
            Intent intent = new Intent(Intent.ACTION_INSERT);
            intent.setData(CalendarContract.Events.CONTENT_URI);
            intent.putExtra(CalendarContract.Events.TITLE, title);
            intent.putExtra(CalendarContract.Events.DESCRIPTION, description);
            intent.putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, allDay);
            intent.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, beginTime);

            if (allDay) {
                // 全天事件结束时间设为同一天的末尾
                Calendar cal = Calendar.getInstance();
                cal.setTimeInMillis(beginTime);
                cal.set(Calendar.HOUR_OF_DAY, 23);
                cal.set(Calendar.MINUTE, 59);
                intent.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, cal.getTimeInMillis());
            } else {
                // 非全天事件默认持续 30 分钟
                intent.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, beginTime + 30 * 60 * 1000);
            }

            // 添加提醒（提前 30 分钟）
            intent.putExtra(CalendarContract.Reminders.MINUTES, 30);

            getActivity().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("无法打开日历应用: " + e.getMessage(), e);
        }
    }
}
