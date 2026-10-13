package com.triagex;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping({
        "/login",
        "/signup",
        "/app",
        "/app/**"
    })
    public String frontend() {
        return "forward:/index.html";
    }
}