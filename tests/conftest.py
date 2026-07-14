import pytest
import os

@pytest.fixture(params=[
    {"width": 1280, "height": 720},   # Desktop
    {"width": 768, "height": 1024},   # Tablet
    {"width": 375, "height": 667},    # Mobile
], ids=["Desktop", "Tablet", "Mobile"])
def browser_context_args(request, browser_context_args):
    return {
        **browser_context_args,
        "viewport": request.param
    }

@pytest.fixture
def page(context):
    page = context.new_page()
    
    errors = []
    
    def handle_pageerror(err):
        errors.append(f"Runtime error: {err}")
        
    def handle_console(msg):
        if msg.type == "error":
            text = msg.text
            # Ignore known React Native Web warnings/errors that are purely styling related
            if "Invalid style property of" in text:
                return
            errors.append(f"Console error: {text}")
            
    def handle_response(response):
        if response.status >= 500:
            errors.append(f"Network error (HTTP {response.status}): {response.url}")
            
    page.on("pageerror", handle_pageerror)
    page.on("console", handle_console)
    page.on("response", handle_response)
    
    yield page
    
    if errors:
        print("Monitoring errors during test:\n" + "\n".join(errors))

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    pytest_html = item.config.pluginmanager.getplugin("html")
    outcome = yield
    report = outcome.get_result()
    extras = getattr(report, "extras", [])
    
    if report.when == "call" and report.failed:
        pass
