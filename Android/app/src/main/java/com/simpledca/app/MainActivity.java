package com.simpledca.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 注册自定义日历插件
        registerPlugin(CalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
